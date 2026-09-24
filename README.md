# cLOUD

A personal cannabis tracking app. Log what you cop, review how it actually smoked, and let the app tell you what your own patterns are — which terpenes you keep rating highly, which combos work for sleep, whether that "indica" actually smokes like one.

Built for one user, on purpose. There's no auth, no multi-tenancy, and no attempt at generality. Every design decision optimizes for *this* person logging *their* weed quickly and honestly.

**Live:** [leonnariley18-ui.github.io/the-cloud-V2](https://leonnariley18-ui.github.io/the-cloud-V2/) · V1 archive: [the-cloud](https://leonnariley18-ui.github.io/the-cloud/)

---

## Stack

| | |
|---|---|
| **Frontend** | React 18 + Vite, one file (`src/app.jsx`) |
| **Styling** | Inline styles. No CSS framework, no CSS files |
| **Backend** | Supabase — a single `cloud_data` row holding one JSONB blob |
| **Auth** | None. Publishable key + a hardcoded `USER_ID` + an RLS policy that allows exactly that row |
| **Hosting** | GitHub Pages, served from `/docs` on `claude/cannabis-tracking-app-rebuild` |
| **PWA** | Manifest + service worker, installable to a phone home screen |

### Why one file

`src/app.jsx` is ~712KB and holds every component in the app. This is deliberate — it makes whole-app refactors and cross-shell consistency checks a single-file operation, and there is exactly one person maintaining it. The tradeoff is real: the file is too large to read in one pass, so navigate it with `grep -n` and targeted line reads rather than opening it whole.

### Why one JSONB blob

All state lives in `cloud_data.data` as a single JSON object, loaded once and written back wholesale on any change (`loadData` / `saveToCloud`).

**The consequence worth knowing:** an open tab re-saves the entire blob when it changes. If you edit data directly in SQL while the app is open anywhere, the next write silently overwrites your change. Close every tab before touching the database.

---

## Two shells, one dataset

The app renders one of two completely separate UIs off the same data:

- **`MobileShell`** — the default. Portrait, touch-first, bottom-sheet flows.
- **`DesktopShell`** — reached by adding `#desktop` to the URL. Retro desktop chrome: collapsible icon sidebar, windowed modals, browser-style page frames.

Both consume the same `useCloudData()` hook, so they stay in sync live. They share data and logic but **not** presentation — desktop is not a widened mobile view, it's its own layout with its own components.

```
useCloudData()  ──┬──►  MobileShell   ──►  HomePage · StashPage · LibraryPage · InsightsPage
                  │                        ComparePage · RecommenderPage · StrainDetailPage
                  │
                  └──►  DesktopShell  ──►  DesktopHomePage · DesktopLibraryPage · InsightsPage
                                           DesktopComparePage · DesktopRecommenderPage
                                           StashSidebar (overlay) · StrainDetailWindow
```

The first-session review is **mobile-only**. Desktop's stash sidebar renders ready-to-try cards from a synthetic strain object and hands it to a read-only detail window.

---

## Data model

Everything hangs off four top-level arrays.

### `strains[]`
The permanent record. One entry per strain, holding every time you've copped it.

```js
{
  id, name, parents: [], intent, starred,
  cops: [{
    id, type, lean, source, container, brand, growType, terpenes: [],
    date, dateIso, firstNotes, status: "on-hand" | "done", finishedDate,
    intent, amount, reupId,
    lite,                    // logged without a first session
    session: {               // null until reviewed
      rating, smokesLike, smokesLikeLean, setting, bedtime,
      spectrums: { sw, sf }, pull,
      tasteTags: [], vibeTags: [], notes, copAgain, date, dateIso
    },
    notes: [], experiences: [], mixes: []
  }]
}
```

`cops[]` is **appended to**, so `cops[0]` is the oldest and the last element is the newest. Anything showing "the current cop" must reach for the end of the array, not the start.

### `coppedEntries[]`
The waiting room. A cop that's been logged but not yet reviewed — surfaced as "ready to try". `handleSaveSession` promotes one into a real `cops[]` entry and deletes it from here.

### `onHand[]`
A denormalized index of what you currently have, so the stash doesn't have to walk every strain. Keyed by `copId`.

### `reups[]` / `finishedReups[]`
Hauls. A re-up groups cops bought at the same time.

```js
{ id, date, dateIso, closed, closedDate, number, copIds: [], coppedIds: [], lite, strainNames: [] }
```

`coppedIds` and `copIds` are **two stages of one lifecycle**, not two kinds of cop:

- `coppedIds` → pending review (ids into `coppedEntries`)
- `copIds` → settled (ids into `strains[].cops`)

`handleSaveSession` moves an id from the first to the second. An id stranded in `coppedIds` keeps a re-up open forever, so every path that removes a ready-to-try entry must strip its id too.

### Dates

Every record stores **both** a display string (`date`, `"Jul 19"`) and a real one (`dateIso`, `"2026-07-19"`). The display string is what renders; `dateIso` is what sorts, groups and counts. `backfillIso` fills the ISO field for anything predating it, pinning `LEGACY_DATA_YEAR`, and is idempotent — safe to leave in place and safe to re-run.

Never compare or sort on `date`. `new Date("Jul 19")` resolves to the year 2001.

### Re-up numbering

`assignReupNumbers()` numbers hauls **by array position**, counting up from `HISTORICAL_REUPS.length + 1`. It only ever numbers a haul that has none — anything already numbered is returned untouched.

`HISTORICAL_REUPS` is a hand-maintained list of five pre-app hauls from V1, which own numbers 1–5 permanently. An unnumbered haul is matched against it on **full ISO date plus a strain-name overlap**, so a future haul landing on the same month and day can't steal a V1 number.

Deleting an empty re-up recounts the rest so the sequence has no gap, but `stripRenumberable` holds numbers 1–`HISTORICAL_REUPS.length` back from that recount. V1 history is settled and never renumbers.

---

## Core flows

### Normal cop
```
+ log a new cop → pick/create a re-up → cop form → coppedEntries ("ready to try")
                → log first session → strains[].cops[] + onHand[]
```

### Lite cop
For bud you already started smoking before you got around to logging it — the app was down, or you just didn't.

```
+ start a lite re-up → same full cop form + a cop-date field
                     → straight to strains[].cops[] + onHand[], session: null
```

A lite cop skips the first-session review but is otherwise a normal cop. You can rate it later, vote cop-again when you finish it, and log notes/experiences/mixes forever. The lite re-up backdates itself to its earliest cop's date.

**`lite` is a display marker, never an analytics gate.** Exclusion is driven by what data actually exists, so a rated lite cop counts everywhere a normal one does. Permanently lost are only the four things a first session produces: spectrums, `smokesLike`, session setting/bedtime, and the first-session tag snapshot.

### Reverse gear
The app was originally write-forward only — every action assumed you were logging it the moment it happened, and nothing could be walked back. These exist for when that isn't true:

| | |
|---|---|
| **Convert a stale "ready to try" into a lite cop** | Skips the review you're never going to write, keeping the **original cop date**. Sets `cop.lite` only — the re-up keeps its own mode and date, so this deliberately does not go through `addLiteCopToReup` |
| **Delete a ready-to-try entry** | Two-tap confirm. Strips the id from `coppedIds` as well, or the haul stays open forever |
| **Un-finish a cop** | Back to on hand, `finishedDate` cleared. Lives in the strain detail, not on a card. Its haul **stays closed** — see below |
| **Delete an experience** | Same gating as the notes delete: on hand, not never-again |
| **Backdate** | Notes, experiences and mixes all take an optional date, defaulting to today |

Not reversible, by design: **never again** is permanent and strain-wide, and the first-session review always stamps today — a session is when you reviewed it, not when you smoked it.

### When a haul closes
A re-up closes itself once every `copIds` entry is `status: "done"` **and** `coppedIds` is empty.

Both conditions can be satisfied by two different actions — finishing the last cop, or deleting the last pending entry — so the check lives in `closeReupIfComplete()` and runs on both paths. It refuses to close a haul with an empty `copIds`: an empty re-up gets deleted, not filed into history.

**Un-finishing does not reopen a closed haul.** `cop.reupId` is never mutated, and the finish handler only searches open re-ups, so a re-finished cop stays attached to its original haul without duplicating it or creating a third open one. The two-open-re-ups cap is only enforced on the create path, which is exactly why un-finish must not reopen anything.

### Gates and locks

- **Terpenes:** `MIN_TERPS = 3`. Enforced while an entry is **ready to try** — the fixer stays open until it's satisfied. Once a cop is on hand, terps are locked.
- **Mixes:** a reviewed mix must carry a leaf rating. "Rate later" queues it into `mixQueue` unrated instead. Once the cop is done, mixes lock entirely — no editing, no rating.
- **Notes and experiences:** editable while the strain is on hand. First-impression and first-session notes are never editable.
- **Never again:** set on any cop, it locks the whole strain, permanently, and hides the un-finish action.

### Rating hygiene
Every rating-derived aggregate filters on `(c.session?.rating||0) > 0` before averaging. An unrated cop is **skipped**, not counted as a zero — otherwise it silently drags every average toward the floor. Counts and frequencies (terpene counts, type distribution) still include unrated cops.

---

## Analytics surfaces

All four read `strains[]` directly and filter on `c.session`:

- **Insights** — a social-feed UI over your own data. Seven "accounts" post about terpenes, mixes, outdoor sessions, bedtime, brands, body type, and intent. Posts can be dismissed or saved. Post ids are **content signatures**, so a post re-appears when the underlying data changes rather than being silenced forever by one dismiss.
- **Compare** — two strains side by side across spectrums, terpenes, vibes, and session notes. Only rated strains are eligible.
- **Recommender** — your terpene fingerprint per intent, winning pairs/trios, and a "might enjoy" tab that surfaces *parents* of your highest-rated strains that you haven't tried.
- **Library** — the full timeline, grouped by month via `dateIso`, filterable and searchable.

---

## Data safety

A single blob written wholesale is fast and simple, and it has exactly one catastrophic failure mode: writing an empty blob over a full one. Three guards, all in `useCloudData()`:

1. **A failed read refuses to enable saving.** It used to fall through to `{}`, blank every collection, set `dataLoaded`, and let the autosave write that emptiness back over the real row. Only the write being blocked too prevented data loss.
2. **The first save after a load is skipped** (`skipEchoSave`) — it's an echo of what was just read, and it was the vector for the above.
3. **A save that would empty every collection at once is blocked** when the server had a row. Nothing in the app can produce that state legitimately.

`CloudErrorBanner` surfaces a failed read in both shells rather than letting the app look empty and healthy.

---

## Development

```bash
npm install
npm run dev          # localhost:5173           (mobile)
                     # localhost:5173/#desktop  (desktop)
npm run build        # → /docs
```

### Deploying

**Pages serves `/docs` from `claude/cannabis-tracking-app-rebuild`, not `main`.** Merging a PR into `main` does not deploy anything. After a merge, fast-forward the deploy branch:

```bash
git push origin main:claude/cannabis-tracking-app-rebuild
```

To make merging deploy on its own, point Pages at `main` `/docs` in repo settings and delete the step above.

Build `/docs` in the same commit as the source change, or the deploy branch ships stale JS against fresh source. Hard-reload after deploying — the service worker will otherwise hand you the previous bundle.

`vite.config.js` builds to `docs/` rather than `dist/` specifically so the source `index.html` at the repo root is never overwritten.

### Testing what a build can't catch

`vite build` only proves the file parses. It will not catch a temporal-dead-zone reference in a hook dependency array, a null field access in a rarely-hit branch, or a click handler swallowed by a stacking-context bug — all of which have shipped green and produced blank screens.

Drive the real UI in headless Chromium instead. The harness must live **inside the project directory** (ESM can't resolve `playwright` from elsewhere), stub `**/rest/v1/cloud_data*` for both the read and the write, and serve `docs/` with the `/the-cloud-V2` base prefix stripped. Assert against the intercepted save payload — that's the actual persisted state.

```js
chromium.launch({executablePath:"/opt/pw-browsers/chromium-1194/chrome-linux/chrome"})
```

Confirm the harness actually fails when the bug is reintroduced — a smoke test that passes against the broken code is worse than none.

---

## Invariants worth not breaking

Each of these was a deliberate decision, and most of them have been "fixed" by accident at least once:

- **`lite` is display-only.** Never gate analytics on it — gate on whether the data exists.
- **`cops[]` is appended.** The newest cop is last, not first.
- **Never again is permanent and strain-wide.** Not per-cop, not undoable.
- **Terps are a ready-to-try concern.** Locked once on hand.
- **Mixes lock when the cop is done.** No late edits, no late ratings.
- **`session.date` always stamps today.** A session is when you reviewed it.
- **Un-finishing leaves the haul closed.** Reopening would slip past the two-open cap.
- **Sort and group on `dateIso`, never `date`.**

---

## Known rough edges

- **`HISTORICAL_REUPS`** is hardcoded pre-app history that the numbering logic reconciles against by matching ISO date + strain name. It works, but it's a hand-maintained constant that has to stay in sync with reality.
- **`StrainDetailWindow` depends on being keyed.** `useState(Math.max(0, cops.length-1))` only picks the right cop because the parent passes `key={strain.id}`, forcing a remount on switch. That's a legitimate React pattern, not a bug, but it's load-bearing and unobvious.
- **The two-open-re-ups cap is enforced only on the create path.** Anything that could produce an open re-up by another route has to opt out of doing so.
- No tests, no CI, no linting. Harnesses get built per-change and thrown away, which catches bugs the day they're written and protects nothing afterward.

**Fixed since the last pass:** the year-less date model and the "day 9139" counter (both now read `dateIso`), and the rules-of-hooks violation in `StrainDetailWindow` (the parent guards it; the early return is gone).

---

## V3 ideas

The recurring theme in V2 was that the app is very good at *capture*, getting better at *analysis*, and did nothing with **time**. Half of that is now addressed. The rest:

### ~~Fix the time model~~ — shipped
Every record carries `dateIso` alongside its display string, legacy records are backfilled, and the reverse gear covers coming back after a gap. Everything below was blocked on this and is now unblocked.

### Tolerance and cadence tracking
How long an eighth actually lasts you, whether your re-up interval is shrinking, whether ratings for a given terpene profile drift down over consecutive cops. The most personally useful thing the data model now supports.

### Rating drift and honesty checks
You rate on first sesh, then keep smoking for two weeks. Prompt for a second rating at finish and show the delta — "you rated this 5 on day one and 3 by the end." Reveals which strains front-load their appeal.

### Make experiences first-class in analytics
Experiences already capture setting, bedtime, and vibes, but only the *first session* feeds most stats. A strain with twelve logged experiences should outweigh one with a single session review. This also quietly fixes lite cops, which will never have first-session data but can accumulate plenty of experiences.

### Predictive cop assistant
The Recommender describes the past. Invert it: given what's on a dispensary menu right now, rank it against your fingerprint. Paste a menu, get a ranked shortlist with reasons ("high myrcene + your asleep profile averages 4.6").

### Mix intelligence
Mixes are logged but barely analyzed. Which pairings beat both parents? Is there a terpene that always improves a mix? Enough mix data exists to say something real.

### Source and value tracking
Brand and grow type are captured but price isn't. Adding amount-versus-price would answer "which dispensary actually gives me the best rating per dollar" — a question the data is one field away from answering.

### Health of the record
A quiet dashboard: how many cops are unrated, how many re-ups are stale, how many strains have no experiences. Nudges toward completeness without nagging. The reverse gear cleans up drift after the fact; this is what would catch it on day three instead of week three.

### Structural
- **Split `app.jsx`.** It's past the point where a single file helps.
- **Commit a smoke-test harness.** The Chromium approach above, checked in and run before every deploy instead of rebuilt from scratch each time.
- **Multi-device conflict handling.** Last-write-wins on a whole-blob save means two open tabs can clobber each other. Row-level fields or a merge strategy would remove the "close every tab" rule.
