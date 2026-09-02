# DonghuaStream

Streaming website for Chinese animation (Donghua) with Indonesian subtitles. Scrapes anichin.moe in real-time — no database required.

## Run & Operate

- **Frontend** (port 18837): workflow `artifacts/donghua-stream: web`
- **API server** (port 8080): workflow `artifacts/api-server: API Server`
- `pnpm install` — install all workspace dependencies
- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from the OpenAPI spec

## Stack

- pnpm workspaces, Node.js 20, TypeScript 5.9
- Frontend: React 19 + Vite 7, Tailwind CSS v4, TanStack Query, Wouter
- API: Express 5
- Scraping: Axios + Cheerio (scrapes anichin.moe)
- API codegen: Orval (from OpenAPI spec in lib/api-spec/openapi.yaml)
- Build: esbuild (ESM bundle for API server)

## Where things live

- `artifacts/donghua-stream/` — React frontend (pages, components, CSS)
- `artifacts/api-server/src/routes/donghua/` — web scraper + route handlers
- `artifacts/api-server/src/routes/donghua/scraper.ts` — all scraping logic (Cheerio)
- `lib/api-spec/openapi.yaml` — source of truth for API contract
- `lib/api-client-react/src/generated/` — generated React Query hooks (do not edit)
- `lib/api-zod/src/generated/` — generated Zod schemas (do not edit)

## Architecture

- No database — all data is scraped on-demand from anichin.moe with in-memory TTL cache
- Cache TTL varies by endpoint: 3 min (ongoing), 5 min (completed/trending), 10 min (upcoming), 1 hour (streams)
- OpenAPI-first contract: spec → codegen → typed hooks on frontend
- Cinematic dark theme only
- API server is backend at port 8080; frontend dev server proxies `/api` to it

## Pages

- Home: hero banner + ongoing/completed/upcoming sections
- Ongoing/Completed: paginated grids with Load More
- Schedule: weekly airing schedule grouped by day
- Search: live search by keyword
- Detail: series info + full episode list
- Watch: embedded video player (iframe) + episode sidebar

## Gotchas

- After every OpenAPI spec change, always run `pnpm --filter @workspace/api-spec run codegen`
- The scraper depends on anichin.moe HTML structure — if that site changes layout, selectors in `scraper.ts` need updating
- `@workspace/db` is NOT used by this project (no DATABASE_URL needed) — but `src/lib/session.ts`, `routes/auth`, `routes/comments`, `routes/profile` import it plus `express-session`/`drizzle-orm`/`bcryptjs`/`pg`, none of which are installed; `pnpm run typecheck` fails on those files. Pre-existing, unrelated to scraping/Dailymotion work — needs its own fix pass (install deps or remove unused auth scaffolding) before those routes can build.
- The API server's `dev` script (`build && start`) is NOT watch mode — editing `src/**` requires restarting the `artifacts/api-server: API Server` workflow before changes take effect; the running process keeps serving the old bundle otherwise.
- Dailymotion embeds are blocked by default (`BLOCKED_SERVERS` in `scraper.ts` and `watch.tsx`) because ad-hoc Dailymotion links scraped from anichin/Animasu are often not embeddable. Our own verified `dongchindopro` channel lookups (`routes/donghua/dailymotion.ts`) are exempted via a `dcsrc=dongchindopro` marker on the embed URL — don't remove that marker or the frontend will silently hide the server again.
- Dailymotion series matching (`dailymotion.ts` `SERIES_ALIASES`) is an explicit, manually maintained slug→code map — intentionally NOT fuzzy, because the channel's upload titles use ad-hoc abbreviations (BTTH, ARMJI, MSBS...) that can't be derived from our slugs. Add new series only after confirming the mapping via the Dailymotion API; an unmapped series just gets no Dailymotion server (safe), never a wrong one.

## User preferences

_Populate as you build — explicit user instructions worth remembering across sessions._
