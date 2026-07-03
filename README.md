# cLOUD V2

A private terpene journal. Built for one.

---

## what it is

cLOUD is a personal cannabis tracking app for logging strains, sessions, mixes, and terpene patterns over time. Every cop gets its own detail page. Every session gets notes, vibes, and spectrums. The library builds itself as you go.

V1 is archived at [leonnariley18-ui.github.io/the-cloud/](https://leonnariley18-ui.github.io/the-cloud/) — everything logged before June 2026 lives there, read-only.

---

## stack

- React + Vite
- Supabase (database, no auth)
- GitHub Pages (hosting)
- No UI library — all styles inline

---

## auth

No login. App opens, data loads. Your `user_id` is hardcoded and your Supabase row is locked to it via RLS policy on the anon key. Solo-use app — the phone's lock screen is enough.

---

## structure

```
src/
└── App.jsx       # the whole app — pages, components, state, styles
public/
└── icons + manifest + sw.js
```

Single file by design. It's a personal tool, not a codebase.

---

## features

### home
Your dashboard. On-hand strains grouped by intent (🌙☀️🏕️), active re-up count, mix queue status. Saved comparisons and saved tips appear as cards only when you have them — otherwise the space stays clean. Everything links out to the relevant page.

### stash
Your active world. Log a new cop, track what's on hand, what's ready to try, what needs a mix review. Tap a strain to open its detail inline. Mix two on-hand strains from stash — they land in the mix queue with mirror entries on both strains. Finished ✓ closes a cop and asks cop-again. Re-ups auto-numbered from history, including V1 data via `HISTORICAL_REUPS`. Most recently finished re-ups sort to the top.

### library
Full strain history grouped by month (collapsible), filterable by starred, cop-again, or rating. Search by name, parent, terpene, or vibe tag. Mixes tab for reviewed mix history. Legacy tab for V1 migrated strains plus a V1 archive link.

### strain detail
Type-themed background (indica purple, sativa gold, hybrid green). Four tabs: overview (spectrums, terpenes, vibes, first impressions), notes, experiences, mixes. Add experiences with setting, bedtime, vibes, and free notes. Cop switcher pills for re-copped strains.

### insights
A social media-style feed of your own data. Seven accounts post insights about your patterns:
- **@terp.talk** — terpene affinity and frequency
- **@the.mix** — reviewed mixes with tap-to-expand solo vs mixed comparison + rating deltas
- **@outside.hours** — outdoor session performance
- **@night.night** — bedtime strains, good/wrong calls, bedtime terpene affinity
- **@the.label** — brands, sources, grow types, label accuracy
- **@body.type** — indica/sativa/hybrid breakdown (pinned, always updated)
- **@on.purpose** — intent breakdown (pinned, always updated)

Dismiss posts from your feed — they persist to Supabase and still live on each account's profile page. Save posts with 🔖 to your profile. Your profile page shows saved insights and a following list of all accounts. Strain names on @the.mix profile are tappable (opens PeekSheet).

### compare
Pick two strains (A/B), see spectrums side by side on shared axes, terpenes, vibes, sesh notes. Shared re-up detection with strainNames fallback for V1 re-ups. Save a comparison — it shows on home when you have one.

### recommender
Your terpene fingerprint by intent — overall, asleep, awake, adventure. 2×2 grid tabs. Top terps, winning combos (pairs + trios), and a tip card you can save. Saved tips show on home. "Might enjoy" tab surfaces parent strains of your 5★, starred, and cop-again-yes strains you haven't tried. Terp search (🔍) — pick up to 3 terpenes and see vibes, notes, conditions, intent + type lean.

### cop form
Intent and amount at the top. Re-cop an existing strain via suggestions. Re-ups group cops from the same haul — auto-numbered, up to 2 open at a time.

---

## data

All data lives in a single Supabase row keyed by `user_id`. One blob, one row. Saved automatically on every state change, guarded by a `dataLoaded` flag to prevent empty overwrites on load.

Persisted state includes: `strains`, `coppedEntries`, `onHand`, `mixQueue`, `reups`, `finishedReups`, `savedComparisons`, `savedTips`, `insightsDismissed`, `insightsSaved`.

---

## V1 → V2 migration notes

- V1 first impressions lived in `cops[].notes[0]` — V2 falls back through `firstNotes → notes[0] → session.notes`
- V1 used SHA-256 PIN auth — V2 has no auth
- V1 data migrated via SQL from `app_data` table into `cloud_data`
- V1 strains appear in the library legacy tab
- `HISTORICAL_REUPS` constant seeds V1 re-up data predating V2 for cross-referencing strains copped together

---

## deploy

```bash
npm install
npm run dev        # local dev
npm run deploy     # build + push to gh-pages
```

---

## what's coming

### desktop layout (V2.1)

A full responsive redesign for wide screens — not a stretched mobile layout, a ground-up desktop experience. Built inside the same `App.jsx` using a `useCloudData` hook to separate data logic from presentation.

**architecture plan:**
- `useCloudData` — all state, Supabase, and handlers extracted into a shared hook
- `MobileShell` — current mobile layout, unchanged
- `DesktopShell` — new desktop layout consuming the same hook
- `main.jsx` detects screen width and renders the right shell
- Feature updates touch the hook or shared components once, both layouts get it

**desktop design decisions (locked):**
- Collapsible sidebar nav (56px collapsed → 200px expanded on hover), amber active indicator
- Slim top bar — date and on hand count only
- Home + stash unified into a dashboard view
- **Retro window chrome** for log a cop and strain detail — chunky amber border, monospace title bar, classic minimize/maximize/close buttons, cLOUD interior styling
- **Slide panels** (right drawer) for note, experience, and mix — lighter weight, stays in context
- Each page retains its own color identity inside the desktop shell

### mobile bug fixes & polish (ongoing)

Collecting notes from real use — coming back with a list.

### cycle × cLOUD integration (future)

Surface current hormonal phase in cLOUD for session context.
