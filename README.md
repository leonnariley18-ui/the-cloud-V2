# cLOUD V2

A private terpene journal. Built for one.

---

## what it is

cLOUD is a personal cannabis tracking app for logging strains, sessions, mixes, and terpene patterns over time. Every cop gets its own detail page. Every session gets notes, vibes, and spectrums. The library builds itself as you go.

V1 is archived at [leonnariley18-ui.github.io/the-cloud/](https://leonnariley18-ui.github.io/the-cloud/) — everything logged before June 2026 lives there, read-only.

---

## stack

- React + Vite
- Supabase (auth + database)
- GitHub Pages (hosting)
- No UI library — all styles inline

---

## auth

Magic link via Supabase. Enter your email, tap the link, you're in. Session persists — you won't see the login screen again on a device unless you clear your browser data.

---

## structure

```
src/
└── App.jsx       # the whole app — pages, components, state, styles
public/
└── icons + manifest
```

Single file by design. It's a personal tool, not a codebase.

---

## features

- **stash** — what's on hand right now, organized by intent (bedtime / daytime / adventure)
- **log a cop** — strain name, type, terpenes, source, amount, parents, first impressions
- **strain detail** — four tabs: overview (spectrums, terpenes, vibes), notes, experiences, mixes
- **library** — full history, filterable by rating and cop-again, grouped by month (collapsible), with a legacy tab for V1 migrated data
- **compare** — pick two strains, see them side by side
- **insights** — terpene affinity, type breakdown, top brands, outdoor tracking
- **recommender** — suggests what to smoke based on intent and mood
- **reups** — track batches and spending over time

---

## data

All data lives in a single Supabase row keyed by `user_id`. One blob, one row, one user. Saved automatically on every state change.

---

## deploy

```bash
npm install
npm run dev        # local dev
npm run deploy     # build + push to gh-pages
```

Requires a `.env.local` or hardcoded Supabase URL + anon key in `App.jsx`.

---

## V1 → V2 migration notes

- V1 saved first impressions as `cops[].notes[0]` — V2 displays these correctly with a fallback
- V1 used `user_token` (SHA-256 PIN hash) for auth — V2 uses Supabase magic link
- V1 data was migrated manually via the import flow and lives in the `legacy` library tab
