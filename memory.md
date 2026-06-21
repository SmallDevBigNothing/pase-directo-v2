# Memory — Pase Directo V4.0 (Multi-Sport + Auto Scraper)

## Project
Deployment: **Netlify** (Functions)
Database: **Supabase** (PostgreSQL)

## Architecture & Technical Decisions
- **Node.js + Express (Netlify Functions + serverless-http)**: Express app wrapped via `serverless-http` in `netlify/functions/server.js`. All routes go through `netlify.toml` redirect.
- **Persistent database in Supabase**: Full CRUD on the `partidos` table plus a new `reportes` table for user-submitted stream-down reports.
- **Dual Stream Source (Ucaster)**: Two channels per match (`ucaster_id_1`, `ucaster_script_1`, `ucaster_id_2`, `ucaster_script_2`) with a dynamic source selector in the player view.
- **Competition Grouping**: Matches are grouped by competition (LaLiga, Champions League, etc.) on the public homepage using the `competicion` column.
- **Multi-Sport Support**: Not just football — supports Basketball, Tennis, Formula 1, MotoGP, IndyCar, and Other via the `deporte` column. Sport filter tabs on homepage allow instant filtering.
- **Automatic Scraper (`scripts/sync-tiroalpalo.js`)**: Node.js script (zero dependencies) that scrapes `tiroalpalof.org/directo` for live matches, extracts Ucaster stream codes from `new.lastzone.top` links, and POSTs to `/api/partidos/sync`. Supports `--dry-run` (default) and `--live` modes. Detects sport type from URL path prefix.
- **Team Logos / Avatars**: Optional `logo_local` and `logo_visitante` URL fields. Enabled for Football and Basketball. When no logo is provided, a deterministic CSS avatar with the team's initials and a unique hue (derived from the team name hash) is generated, and the browser dynamically queries TheSportsDB to load the badge.

- **Countdown Timers**: Upcoming matches show a real-time countdown (`Starts in 02h 15m 10s`) that ticks every second via client-side `setInterval`.
- **Search / Filter + Sport Tabs**: Client-side instant search on the public homepage filters match cards by team name, competition, or sport. Sport tabs provide one-click filtering by sport type.
- **Report System (Anti-Spam)**:
  - Located on the homepage match cards (under the "Watch Now" button for Live matches, split by Channel 1 / Channel 2).
  - Client side: `localStorage` cooldown of 5 minutes per match per channel.
  - Server side: Max 50 reports per match+channel (silently capped).
  - Reports are stored in the `reportes` table with `partido_id`, `canal` (1 or 2), and `created_at`.
- **Admin Dashboard**:
  - Stats cards (live count, upcoming count, total reports).
  - AJAX toggle switches to flip status (`Live` ↔ `Upcoming`) without page reload.
  - Reports inbox with per-match "Clear" button.
  - Stream preview modal (opens player in an iframe via `/admin/preview/:id`).
  - Full form for adding/editing matches with competition, logo URLs, and Ucaster fields.
- **Stateless Cookie Auth (Serverless-Safe)**: Replaces `express-session`. Uses Node.js native `crypto` module with HMAC-SHA256 signed cookies. No external dependencies required. Survives serverless cold starts indefinitely. Cookie name: `pd_admin`, max-age: 7 days.
- **All UI in English**: Every interface element (homepage, player, admin login, admin panel) is in English.
- **Security**: Admin password from `ADMIN_PASSWORD` env var (default `AdminFutbol2026`).

## Database Schema (Supabase)

### Table: `partidos`
| Column | Type | Notes |
|---|---|---|
| `id` | uuid | Primary key, auto-generated |
| `local` | text | Home team name |
| `visitante` | text | Away team name |
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
| GET | `/` | Public | Homepage with live/upcoming matches |
| GET | `/partido/:id` | Public | Player page (live matches only) |
| POST | `/api/partidos/:id/report` | Public | Report a stream as down |
| POST | `/api/partidos/:id/toggle-status` | Admin | Toggle Live/Upcoming via AJAX |
| POST | `/api/partidos/:id/clear-reports` | Admin | Clear all reports for a match |
| GET | `/admin/login` | Public | Login page |
| POST | `/admin/login` | Public | Login action |
| GET | `/admin/logout` | Admin | Logout action |
| GET | `/admin` | Admin | Dashboard |
| GET | `/admin/preview/:id` | Admin | Stream preview (iframe) |
| POST | `/admin/add` | Admin | Add new match |
| POST | `/admin/editar/:id` | Admin | Edit existing match |
| POST | `/admin/eliminar/:id` | Admin | Delete match |
| POST | `/api/partidos/sync` | Bearer | Scraper sync API (accepts `deporte` field) |

## Deployment & Verification Status

### Current Stage: Pushed & Verified in Production
- **Branch**: `test-execution-commands` has been committed and pushed to GitHub. A Pull Request is pending merge to `main`.
- **Database Status**: The Supabase table constraint `partidos_estado_check` was updated via SQL migration to accept `'Live'` and `'Upcoming'` (previously limited to Spanish `'En Directo'` / `'Próximo Partido'`).
- **Production Sync**: The scraper script was successfully run against the production URL (`https://futbol.topdev.vip`), inserting 4 active matches into the Supabase database.
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
