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

- **home** — on hand by intent, last comparison, live tip, log a cop
- **stash** — active reup management, strain cards with note/experience/mix/finish actions
- **library** — full strain history grouped by month (collapsible), filterable, with a legacy tab for V1 migrated data and a V1 archive link
- **strain detail** — four tabs: overview (spectrums, terpenes, vibes, first impressions), notes, experiences, mixes. cop switcher for re-copped strains
- **insights** — terpene affinity, type breakdown, brands, outdoor sessions, bedtime patterns, intent breakdown
- **compare** — pick two strains, see spectrums side by side on a shared axis
- **recommender** — terpene fingerprint by intent, winning combos, strain suggestions
- **reups** — batch tracking with open/close history

---

## data

All data lives in a single Supabase row keyed by `user_id`. One blob, one row. Saved automatically on every state change, guarded by a `dataLoaded` flag to prevent empty overwrites on load.

---

## V1 → V2 migration notes

- V1 first impressions lived in `cops[].notes[0]` — V2 falls back through `firstNotes → notes[0] → session.notes`
- V1 used SHA-256 PIN auth — V2 has no auth
- V1 data migrated via SQL from `app_data` table into `cloud_data`
- V1 strains appear in the library legacy tab

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
