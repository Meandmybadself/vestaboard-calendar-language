# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm install              # Install dependencies
pnpm dev                  # Dev mode: wrangler dev --test-scheduled (simulates cron triggers using .dev.vars)
pnpm deploy               # Deploy to Cloudflare Workers
node index.js             # Local execution (requires exported env vars)
```

No automated test suite exists. Test manually with `pnpm dev` and watch console output. Set `CRON_SCHEDULE='* * * * *'` in `.dev.vars` for rapid feedback.

## Architecture

ES modules app that runs as a cron job, checks an ICS calendar for current events, and updates a physical Vestaboard display. There are two execution modes sharing the same core logic:

**Cloudflare Worker mode** (primary, `src/index.js`): Exports a `scheduled` handler triggered by Wrangler's cron (configured in `wrangler.toml` as `*/1 6-22 * * *`). Env vars come from the Worker environment. Flow: `src/index.js` → `src/calendar.js` → `src/content-providers/index.js` → `src/vestaboard.js`.

**Node.js mode** (`index.js`): Standalone entry for local long-running execution. Flow: `index.js` → `src/config.js` (validate env via `process.env`) → `src/scheduler.js` (node-cron) → same core modules on each tick.

**Content provider system:** Calendar event titles matching keywords route through `src/content-providers/index.js` to specialized modules. Non-keyword titles display as static text.

| Keyword | Module | Notes |
|---|---|---|
| `WEATHER` | `weather.js` | Requires OpenWeather config |
| `LUNCH` | `lunch.js` | |
| `QUOTE` | `quote.js` | |
| `URL:https://...` | `url-fetcher.js` | URL follows colon |
| `COLOR_RANDOM`, `COLOR_VERTICAL`, `COLOR_HORIZONTAL`, `COLOR_DIAGONAL` | `colors.js` | Returns raw 2D color-code array |
| `SAVE` / `RESTORE` | `storage.js` | Saves/restores board state; no board write |
| `COUNTDOWN_DAYS MM/DD/YY Title` | `countdown.js` | Shows days remaining on line 1, title on line 2 |
| `COUNTDOWN_TIME MM/DD/YY HH:MM:SS Title` | `countdown.js` | Shows labeled time units on line 1 (e.g. `2d 3h 15m 30s`), title on line 2; leading zero units suppressed; expired = no board update |

**Vestaboard API:** Text → compose endpoint (`vbml.vestaboard.com/compose`) converts to character codes → update endpoint (`rw.vestaboard.com/`) writes to board. Color grids bypass compose and send raw 2D arrays directly. Auth via `X-Vestaboard-Read-Write-Key` header.

## Code Style

- 2-space indentation, ES modules, arrow functions
- `const` by default, `let` only when reassignment needed
- Explicit exports (`export const foo`)
- Upper-snake-case for env vars, camelCase for code
- Log messages prefixed with module context (`scheduler`, `calendar`, `vestaboard`)

## Configuration

Required env vars: `ICS_CALENDAR_URL`, `VESTABOARD_API_KEY`. Optional: `OPENWEATHER_API_KEY`/`OPENWEATHER_LAT`/`OPENWEATHER_LON` (for WEATHER), `STATE_STORAGE_PATH`, `CRON_SCHEDULE`, `TIMEZONE` (default `America/Chicago`, used by countdown providers). Local dev uses `.dev.vars` (never committed). Cloudflare secrets via `npx wrangler secret put <KEY>`.
