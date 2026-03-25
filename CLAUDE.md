# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
pnpm install              # Install dependencies
node index.js             # Run locally (requires exported env vars or .env file)
pnpm start                # Same as above via npm script
```

No automated test suite exists. Test manually with `node index.js` and watch console output. Set `CRON_SCHEDULE='* * * * *'` in your `.env` for rapid feedback.

## Deployment

The app runs on a local Linux instance managed by PM2.

```bash
# On the Linux instance after SSH:
git pull
pnpm install
pm2 restart vestaboard-calendar   # or: pm2 reload vestaboard-calendar
```

Typical workflow: commit to `main` → SSH into instance → `git pull` → `pm2 restart`.

## Architecture

ES modules app that runs as a long-running Node.js process, checking an ICS calendar on a cron schedule and updating a physical Vestaboard display.

Entry point: `index.js` → `src/config.js` (validate env via `process.env`) → `src/scheduler.js` (node-cron) → `src/calendar.js` → `src/content-providers/index.js` → `src/vestaboard.js`.

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

Required env vars: `ICS_CALENDAR_URL`, `VESTABOARD_API_KEY`. Optional: `OPENWEATHER_API_KEY`/`OPENWEATHER_LAT`/`OPENWEATHER_LON` (for WEATHER), `STATE_STORAGE_PATH`, `CRON_SCHEDULE` (default `*/1 6-22 * * *`), `TIMEZONE` (default `America/Chicago`, used by countdown providers). Use a `.env` file locally (never committed). On the Linux instance, set env vars in the PM2 ecosystem config or export them before starting.
