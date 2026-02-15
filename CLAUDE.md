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

Node.js app (ES modules) that runs as a cron job, checks an ICS calendar for current events, and updates a physical Vestaboard display.

**Flow:** `index.js` (bootstrap) → `src/config.js` (validate env) → `src/scheduler.js` (cron) → on each tick: `src/calendar.js` (fetch/parse ICS, find current event) → `src/content-providers/index.js` (resolve dynamic content if keyword match) → `src/vestaboard.js` (compose text to 6x22 character grid, push to board API)

**Content provider system:** Calendar event titles matching keywords (`WEATHER`, `LUNCH`, `QUOTE`, `URL:...`, `COLOR_*`, `SAVE`, `RESTORE`) route through `src/content-providers/index.js` to specialized modules (`weather.js`, `lunch.js`, `quote.js`, `url-fetcher.js`, `colors.js`). State management (`SAVE`/`RESTORE`) uses `src/storage.js`. Non-keyword titles display as static text.

**Vestaboard API:** Text → compose endpoint (`vbml.vestaboard.com/compose`) converts to character codes → update endpoint (`rw.vestaboard.com/`) writes to board. Color grids bypass compose and send raw 2D arrays directly. Auth via `X-Vestaboard-Read-Write-Key` header.

## Code Style

- 2-space indentation, ES modules, arrow functions
- `const` by default, `let` only when reassignment needed
- Explicit exports (`export const foo`)
- Upper-snake-case for env vars, camelCase for code
- Log messages prefixed with module context (`scheduler`, `calendar`, `vestaboard`)

## Configuration

Required env vars: `ICS_CALENDAR_URL`, `VESTABOARD_API_KEY`. Optional: `OPENWEATHER_API_KEY`/`OPENWEATHER_LAT`/`OPENWEATHER_LON` (for WEATHER), `STATE_STORAGE_PATH`, `CRON_SCHEDULE`. Local dev uses `.dev.vars` (never committed). Cloudflare secrets via `npx wrangler secret put <KEY>`.
