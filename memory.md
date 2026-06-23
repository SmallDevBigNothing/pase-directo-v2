# Memory — Pase Directo V4.1 (Multi-Sport + Sandboxed Ad-Blocking)

## Project
Deployment: **Netlify** (Functions)
Database: **Supabase** (PostgreSQL)

## Architecture & Technical Decisions
- **Node.js + Express (Netlify Functions + serverless-http)**: Express app wrapped via `serverless-http` in `netlify/functions/server.js`. All routes go through `netlify.toml` redirect.
- **Persistent database in Supabase**: Full CRUD on the `partidos` table plus a new `reportes` table for user-submitted stream-down reports.
- **Sandboxed Player (Ad-Blocking)**: Completely bypasses remote script executions of `hucaster.js` (which loaded intrusive overlay/popup ads). Instead, the player now generates a sandboxed `<iframe>` pointing directly to the channel embed on `new.lastzone.top`.
  * Sandbox rules: `sandbox="allow-scripts allow-same-origin allow-presentation"`
  * This blocks popups, popunders, new tabs, and top-level redirection while keeping HLS stream playback intact.
- **Dual Stream Source (Ucaster)**: Two channels per match (`ucaster_id_1`, `ucaster_script_1`, `ucaster_id_2`, `ucaster_script_2`) with a dynamic source selector in the player view.
- **No-Stream Status Logic**: To prevent users from navigating to broken empty player views:
  * Matches with no active streams configured (both `ucaster_id` columns are null) are forced to `'Upcoming'` state on database inserts, updates, and toggle-status triggers.
  * Homepage dynamically filters out live matches without active streams, treating them as `Upcoming`.
  * Accessing `/partido/:id` direct URLs for streamless matches returns a 404.
- **Competition Grouping**: Matches are grouped by competition (LaLiga, Champions League, etc.) on the public homepage using the `competicion` column.
- **Multi-Sport Support**: Not just football — supports Basketball, Tennis, Formula 1, MotoGP, IndyCar, and Other via the `deporte` column. Sport filter tabs on homepage allow instant filtering.
- **Optimized Automatic Scraper (`scripts/sync-tiroalpalo.js`)**:
  * Scrapes `tiroalpalof.org/directo` for live matches, extracts Ucaster codes from `new.lastzone.top` links, and POSTs to `/api/partidos/sync`.
  * **Timezone Offset Patch**: Uses the Madrid timezone to dynamically shift early morning matches (0:00–5:00) to the next calendar date only if scraping in the afternoon/evening of the previous day, preventing incorrect offsets when run in the morning.
  * **Concurrent Scrapes**: Fetches detail pages concurrently (limit of 3 workers) to run faster and prevent sequential timeouts.
  * **Robust Regex**: Regex parser allows unquoted, single-quoted, and absolute link href attributes.
  * **Stale Match Auto-Deletion**: When the scraper posts updates, any `Live` match in the database with configured channels that is missing from the incoming scraper payload is deleted automatically to keep pages clean.
- **Webpage Aesthetics (Premium Revamp)**:
  * Sticky glassmorphism header (`backdrop-filter: blur(20px)`) and stats indicator bar.
  * Radial gradient ambient glows (red/orange) overlaid on a deep dark layout.
  * Glassmorphic cards with responsive sizes, hover scale effects, and glows.
  * Sport-specific badge indicators (`⚽ Football`, `🏀 Basketball`, `🏎️ Formula 1`, etc.).
  * Stateless Cookie Auth (`crypto` HMAC-SHA256, serverless-safe).
  * Stateless cookie name: `pd_admin`, max-age: 7 days.
- **All UI in English**: Every interface element is in English.
- **Security**: Admin password from `ADMIN_PASSWORD` env var (default `AdminFutbol2026`).

## Database Schema (Supabase)

### Table: `partidos`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key, auto-generated |
| `local` | text | Home team name |
| `visitante` | text | Away team name (optional for solo sports) |
| `hora` | timestamptz | Match date/time |
| `estado` | text | `Live` or `Upcoming` |
| `competicion` | text | Competition name, default `Other` |
| `logo_local` | text | URL to home team logo (optional) |
| `logo_visitante` | text | URL to away team logo (optional) |
| `ucaster_id_1` | text | Channel 1 ID |
| `ucaster_script_1` | text | Channel 1 script URL |
| `ucaster_id_2` | text | Channel 2 ID |
| `ucaster_script_2` | text | Channel 2 script URL |
| `deporte` | text | Sport type, default `Football` (Football, Basketball, Tennis, Formula 1, MotoGP, IndyCar, Other) |
| `created_at` | timestamptz | Auto-generated |

### Table: `reportes`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key, auto-generated |
| `partido_id` | uuid | FK → `partidos(id)` ON DELETE CASCADE |
| `canal` | integer | 1 or 2 (CHECK constraint) |
| `created_at` | timestamptz | Auto-generated |

## Environment Variables (Netlify Settings)
- `SUPABASE_URL`: Supabase connection URL.
- `SUPABASE_KEY`: Supabase `service_role` key (write permissions).
- `ADMIN_PASSWORD`: Password to access the admin panel.
- `SESSION_SECRET`: Secret for signing the admin auth cookie (HMAC-SHA256).
- `SCRAPER_API_TOKEN`: Bearer token for the `/api/partidos/sync` endpoint.
- `NODE_ENV`: Set to `production` in Netlify.

## API Endpoints
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/` | Public | Homepage with live/upcoming matches (filtered by active streams) |
| GET | `/partido/:id` | Public | Player page (live matches with active streams only) |
| POST | `/api/partidos/:id/report` | Public | Report a stream as down |
| POST | `/api/partidos/:id/toggle-status` | Admin | Toggle Live/Upcoming via AJAX (blocked if streamless) |
| POST | `/api/partidos/:id/clear-reports` | Admin | Clear all reports for a match |
| GET | `/admin/login` | Public | Login page |
| POST | `/admin/login` | Public | Login action |
| GET | `/admin/logout` | Admin | Logout action |
| GET | `/admin` | Admin | Dashboard |
| GET | `/admin/preview/:id` | Admin | Stream preview (iframe) |
| POST | `/admin/add` | Admin | Add new match (forces `Upcoming` if streamless) |
| POST | `/admin/editar/:id` | Admin | Edit existing match (forces `Upcoming` if streamless) |
| POST | `/admin/eliminar/:id` | Admin | Delete match |
| POST | `/api/partidos/sync` | Bearer | Scraper sync API (forces `Upcoming` if streamless, deletes ended matches) |

## Deployment & Verification Status

### Current Stage: Local Commited & Pushed
- **Branch**: `pull-and-review-changes` has been committed and pushed to GitHub. A Pull Request is pending merge to `main`.
- **Database Status**: The Supabase table constraint `partidos_estado_check` is configured to accept `'Live'` and `'Upcoming'`.
- **Netlify Configuration**: `SCRAPER_API_TOKEN` environment variable was configured via the Netlify API with value `secreto-pase-directo-2026`.

### Automation Setup
- A GitHub Actions workflow (`.github/workflows/sync.yml`) is configured to run the scraper every 15 minutes automatically once the branch is merged and repository secrets (`API_URL` and `SCRAPER_API_TOKEN`) are configured on GitHub.

## Scraper Usage
```bash
# Dry-run (default) — logs scraped data to console
node scripts/sync-tiroalpalo.js --dry-run

# Live mode — POSTs to sync API
node scripts/sync-tiroalpalo.js --live --api-url https://futbol.topdev.vip --token secreto-pase-directo-2026
```
