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
| **Hosting** | GitHub Pages, served from `/docs` on `claude/cannabis-tracking-app-rebuild` |
| **PWA** | Manifest + service worker, installable to a phone home screen |

### Why one file

`src/app.jsx` is ~600KB and holds every component in the app. This is deliberate — it makes whole-app refactors and cross-shell consistency checks a single-file operation, and there is exactly one person maintaining it. The tradeoff is real: the file is too large to read in one pass, so navigate it with `grep -n` and targeted line reads rather than opening it whole.

### Why one JSONB blob

All state lives in `cloud_data.data` as a single JSON object, loaded once and written back wholesale on any change (`app.jsx` — `loadData` / `saveToCloud`).

**The consequence worth knowing:** an open tab re-saves the entire blob when it loads. If you edit data directly in SQL while the app is open anywhere, the next page load silently overwrites your change. Close every tab before touching the database.

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
    date, firstNotes, status: "on-hand" | "done", intent, amount, reupId,
    lite,                    // logged without a first session
    session: {               // null until reviewed
      rating, smokesLike, smokesLikeLean, setting, bedtime,
      spectrums: { sw, sf }, pull,
      tasteTags: [], vibeTags: [], notes, copAgain, date
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
{ id, date, closed, number, copIds: [], coppedIds: [], lite, dateIso }
```

`coppedIds` and `copIds` are **two stages of one lifecycle**, not two kinds of cop:

- `coppedIds` → pending review (ids into `coppedEntries`)
- `copIds` → settled (ids into `strains[].cops`)

`handleSaveSession` moves an id from the first to the second. A re-up closes itself once every `copIds` entry is `status: "done"` **and** `coppedIds` is empty — so an id stranded in `coppedIds` keeps a re-up open forever.

Numbering comes from `assignReupNumbers()`, which assigns sequentially by array position — **never by date**. Backdating a re-up is safe; it only changes display.

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

### Rating hygiene
Every rating-derived aggregate filters on `(c.session?.rating||0) > 0` before averaging. An unrated cop is **skipped**, not counted as a zero — otherwise it silently drags every average toward the floor. Counts and frequencies (terpene counts, type distribution) still include unrated cops.

---

## Analytics surfaces

All four read `strains[]` directly and filter on `c.session`:

- **Insights** — a social-feed UI over your own data. Seven "accounts" post about terpenes, mixes, outdoor sessions, bedtime, brands, body type, and intent. Posts can be dismissed or saved.
- **Compare** — two strains side by side across spectrums, terpenes, vibes, and session notes. Only rated strains are eligible.
- **Recommender** — your terpene fingerprint per intent, winning pairs/trios, and a "might enjoy" tab that surfaces *parents* of your highest-rated strains that you haven't tried.
- **Library** — the full timeline, grouped by month, filterable and searchable.

---

## Development

```bash
npm install
npm run dev          # localhost:5173           (mobile)
                     # localhost:5173/#desktop  (desktop)
npm run build        # → /docs
```

### Deploying
Pages serves `/docs` from `claude/cannabis-tracking-app-rebuild`:

```bash
npm run build
git add -A
git commit -m "..."
git push -f origin claude/cannabis-tracking-app-rebuild
```

Hard-reload after deploying — the service worker will otherwise hand you the previous bundle.

`vite.config.js` builds to `docs/` rather than `dist/` specifically so the source `index.html` at the repo root is never overwritten.

### Testing what a build can't catch

`vite build` only proves the file parses. It will not catch a temporal-dead-zone reference in a hook dependency array, a null field access in a rarely-hit branch, or a click handler swallowed by a stacking-context bug — all of which have shipped and produced blank screens.

For anything touching a detail view or a shared component, server-render it before shipping:

```bash
mkdir -p .smoketest && cp src/app.jsx .smoketest/app_test.jsx
# export the components under test, write a smoke.jsx that renderToString()s
# them across lite / normal / finished fixtures, build --ssr, run with node
```

Confirm the harness actually fails when the bug is reintroduced — a smoke test that passes against the broken code is worse than none.

---

## Known rough edges

- **Rules of hooks:** `StrainDetailWindow` early-returns before its `useState` calls. It works only because the parent keys it by strain id, forcing a remount. Fragile.
- **`daysSince()`** parses `"Jul 19"` with no year, so JS resolves it to 2001 and the "day N" counter on stash cards is wrong.
- **Dates are display strings** (`"Jul 19"`), not real dates. No year is stored anywhere. Sorting and grouping work off string manipulation.
- **`HISTORICAL_REUPS`** is hardcoded pre-app history that the numbering logic reconciles against by matching date + strain name.
- No tests, no CI, no linting.

---

## V3 ideas

Drawn from what actually got prioritized while building V2 — the recurring theme is that the app is very good at *capture* and getting better at *analysis*, but does nothing with **time**.

### Fix the time model
The single highest-leverage change. Dates are year-less display strings, which already produces a wrong "day N" counter and makes any temporal question unanswerable. Store an ISO date alongside the display string everywhere (the lite re-up's `dateIso` is the pattern). That unlocks everything below.

### Tolerance and cadence tracking
With real dates: how long an eighth actually lasts you, whether your re-up interval is shrinking, whether ratings for a given terpene profile drift down over consecutive cops. This is the most personally useful thing the current data model *almost* supports.

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
A quiet dashboard: how many cops are unrated, how many re-ups are stale, how many strains have no experiences. Nudges toward completeness without nagging — and would have surfaced the stray "ready to try" entry that sat unnoticed for a month.

### Structural
- **Split `app.jsx`.** It's past the point where a single file helps.
- **Add a smoke-test harness for real.** The SSR approach above, committed and run before every deploy.
- **Multi-device conflict handling.** Last-write-wins on a whole-blob save means two open tabs can clobber each other. Row-level fields or a merge strategy would remove the "close every tab" rule.
