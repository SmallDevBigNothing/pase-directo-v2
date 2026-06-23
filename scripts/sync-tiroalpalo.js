#!/usr/bin/env node

/**
 * sync-tiroalpalo.js
 *
 * Scrapes live sports matches from https://tiroalpalof.org/directo
 * and sends them to the Pase Directo sync API.
 *
 * Usage:
 *   node scripts/sync-tiroalpalo.js --dry-run          # (default) log only
 *   node scripts/sync-tiroalpalo.js --live              # POST to sync API
 *   node scripts/sync-tiroalpalo.js --live --api-url http://example.com --token my-secret
 *
 * Requires Node.js >= 18 (native fetch).
 */

// ---------------------------------------------------------------------------
// CLI argument parsing
// ---------------------------------------------------------------------------

const args = process.argv.slice(2);

function flag(name) {
  return args.includes(name);
}

function option(name, fallback) {
  const idx = args.indexOf(name);
  return idx !== -1 && idx + 1 < args.length ? args[idx + 1] : fallback;
}

const DRY_RUN = !flag('--live');                                 // default: dry-run
const API_URL = option('--api-url', 'http://localhost:3001');
const API_TOKEN = option('--token', 'test-token-123');

const BASE_URL = 'https://tiroalpalof.org';
const DIRECTO_URL = `${BASE_URL}/directo`;
const UCASTER_SCRIPT = 'https://new.lastzone.top/static/scripts/hucaster.js';
const RATE_LIMIT_MS = 500;

// ---------------------------------------------------------------------------
// Logging helpers
// ---------------------------------------------------------------------------

function log(prefix, ...msgs) {
  console.log(`[${prefix}]`, ...msgs);
}

// ---------------------------------------------------------------------------
// HTTP helpers
// ---------------------------------------------------------------------------

/**
 * Fetch a URL and return its body as text.
 * Throws on non-2xx responses.
 */
async function fetchText(url) {
  log('SCRAPER', `GET ${url}`);
  const res = await fetch(url, {
    headers: {
      'User-Agent': 'Mozilla/5.0 (compatible; PaseDirectoSync/1.0)',
      'Accept': 'text/html,application/xhtml+xml,*/*',
    },
  });
  if (!res.ok) {
    throw new Error(`HTTP ${res.status} for ${url}`);
  }
  return res.text();
}

/** Simple delay helper for rate limiting. */
function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ---------------------------------------------------------------------------
// Sport detection from URL path
// ---------------------------------------------------------------------------

const SPORT_MAP = {
  'futbol': 'Football',
  'indycar': 'IndyCar',
  'baloncesto': 'Basketball',
  'tenis': 'Tennis',
  'formula-1': 'Formula 1',
  'motogp': 'MotoGP',
};

/**
 * Detect the sport from the first path segment of a match URL.
 * E.g.  /futbol/mundial-2026/match-slug  →  "Football"
 */
function detectSport(urlPath) {
  // urlPath looks like "/futbol/mundial-2026/slug"
  const segments = urlPath.replace(/^\//, '').split('/');
  const key = segments[0] || '';
  return SPORT_MAP[key] || 'Other';
}

// ---------------------------------------------------------------------------
// Competition extraction from URL path
// ---------------------------------------------------------------------------

/**
 * Extract competition name from the second path segment.
 * E.g.  /futbol/mundial-2026/slug  →  "Mundial 2026"
 *
 * Replaces dashes with spaces and title-cases each word.
 */
function extractCompetition(urlPath) {
  const segments = urlPath.replace(/^\//, '').split('/');
  const raw = segments[1] || '';
  if (!raw) return 'Unknown';

  return raw
    .split('-')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

// ---------------------------------------------------------------------------
// Title parsing
// ---------------------------------------------------------------------------

/**
 * Parse a match title string into { local, visitante, time }.
 *
 * Team sports:    "Bélgica - Irán (21:00)"   → { local: "Bélgica", visitante: "Irán", time: "21:00" }
 * Non-team:       "IndyCar | GP de Road America (20:30)" → { local: "GP de Road America", visitante: "", time: "20:30" }
 */
function parseTitle(raw) {
  const title = raw.trim();

  // Extract time in parentheses at the end — e.g. "(21:00)"
  const timeMatch = title.match(/\((\d{1,2}:\d{2})\)\s*$/);
  const time = timeMatch ? timeMatch[1] : null;

  // Remove the time portion to get the name part
  const namePart = (timeMatch ? title.slice(0, timeMatch.index) : title).trim();

  // Team sport: contains " - " separator
  if (namePart.includes(' - ')) {
    const [local, visitante] = namePart.split(' - ').map((s) => s.trim());
    return { local, visitante, time };
  }

  // Non-team sport: may contain " | " separator (e.g. "IndyCar | GP de Road America")
  if (namePart.includes(' | ')) {
    const parts = namePart.split(' | ');
    // Use everything after the pipe as the event name
    const eventName = parts.slice(1).join(' | ').trim();
    return { local: eventName || namePart, visitante: '', time };
  }

  // Fallback: use full name as local
  return { local: namePart, visitante: '', time };
}

// ---------------------------------------------------------------------------
// Time handling — Europe/Madrid timezone
// ---------------------------------------------------------------------------

/**
 * Convert a "HH:MM" string into an ISO 8601 UTC datetime for today
 * in the Europe/Madrid timezone.
 *
 * If the hour is between 0 and 5 (inclusive), we assume the match is
 * actually tomorrow (late-night / early-morning broadcast).
 */
function buildIsoDatetime(timeStr) {
  if (!timeStr) return null;

  const [hours, minutes] = timeStr.split(':').map(Number);

  // Get "today" in Europe/Madrid as a YYYY-MM-DD string
  const nowMadrid = new Date().toLocaleString('en-CA', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }); // "2026-06-21"

  const [y, m, d] = nowMadrid.split('-').map(Number);
  let date = new Date(Date.UTC(y, m - 1, d));

  // Determine current hour in Europe/Madrid to avoid tomorrow shifts when running in the morning
  const now = new Date();
  const formatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Madrid',
    hour: 'numeric',
    hour12: false
  });
  const parts = formatter.formatToParts(now);
  let currentMadridHour = 0;
  parts.forEach(p => {
    if (p.type === 'hour') {
      currentMadridHour = Number(p.value);
    }
  });
  if (currentMadridHour === 24) currentMadridHour = 0;

  // If time is very early (0:00–5:00) and we're scraping in the afternoon/evening (>= 12:00)
  // of the previous day, assume it belongs to tomorrow.
  if (hours >= 0 && hours <= 5 && currentMadridHour >= 12) {
    date.setUTCDate(date.getUTCDate() + 1);
  }

  const targetYear = date.getUTCFullYear();
  const targetMonth = date.getUTCMonth() + 1;
  const targetDay = date.getUTCDate();

  // Create date assuming the values are UTC
  const utcDate = new Date(Date.UTC(targetYear, targetMonth - 1, targetDay, hours, minutes, 0));

  // Format this date in Madrid timezone to see what wall-clock time it gets
  const utcFormatter = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Europe/Madrid',
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: 'numeric',
    second: 'numeric',
    hour12: false
  });

  const utcParts = utcFormatter.formatToParts(utcDate);
  const val = {};
  utcParts.forEach(p => { val[p.type] = Number(p.value); });

  const madridHour = val.hour === 24 ? 0 : val.hour;
  const madridWallClock = new Date(Date.UTC(val.year, val.month - 1, val.day, madridHour, val.minute, val.second));

  const diffMs = madridWallClock.getTime() - utcDate.getTime();
  return new Date(utcDate.getTime() - diffMs).toISOString();
}

// ---------------------------------------------------------------------------
// Step 1: Scrape the /directo listing page
// ---------------------------------------------------------------------------

/**
 * Parse the listing page HTML and return an array of
 * { href, title } objects — one per match link.
 */
function parseListingPage(html) {
  const matches = [];

  // Match <li> items inside the tag category list.
  // We look for <a href="..."> with text content that represents a match.
  // The regex captures href and the inner text (which may be inside <h3> etc.).
  const linkRe = /<a\s+[^>]*href=["']?([^"'\s>]+)["']?[^>]*>([\s\S]*?)<\/a>/gi;
  let m;

  while ((m = linkRe.exec(html)) !== null) {
    const href = m[1];
    const innerHtml = m[2];

    // Normalize href to be relative if it starts with the base domain
    let cleanHref = href;
    if (href.startsWith('http://') || href.startsWith('https://')) {
      try {
        const urlObj = new URL(href);
        cleanHref = urlObj.pathname;
      } catch (err) {
        continue;
      }
    }

    // Only consider links whose path starts with a known sport prefix
    // (they look like "/futbol/...", "/indycar/...", etc.)
    if (!cleanHref.startsWith('/') || cleanHref === '/directo') continue;

    // Strip HTML tags from inner content to get plain text title
    const title = innerHtml.replace(/<[^>]+>/g, '').trim();
    if (!title) continue;

    // Quick sanity check: must contain a time like "(HH:MM)" to be a match
    if (!/\(\d{1,2}:\d{2}\)/.test(title)) continue;

    matches.push({ href: cleanHref, title });
  }

  // Deduplicate by href (some links may appear twice in navigation)
  const seen = new Set();
  return matches.filter((item) => {
    if (seen.has(item.href)) return false;
    seen.add(item.href);
    return true;
  });
}

// ---------------------------------------------------------------------------
// Step 2: Scrape a match detail page for UCASTER stream links
// ---------------------------------------------------------------------------

/**
 * Parse a match detail page and extract UCASTER channel IDs
 * from links pointing to new.lastzone.top/{channelId}.
 *
 * Returns an array of channel ID strings (usually 1–2).
 */
function parseDetailPage(html) {
  const channels = [];

  // Look for links to new.lastzone.top
  const re = /href="https?:\/\/new\.lastzone\.top\/([a-zA-Z0-9_-]+)"/gi;
  let m;

  while ((m = re.exec(html)) !== null) {
    const channelId = m[1];
    // Skip paths that are clearly not channel IDs (e.g. "static")
    if (channelId === 'static' || channelId.includes('/')) continue;
    if (!channels.includes(channelId)) {
      channels.push(channelId);
    }
  }

  return channels;
}

// ---------------------------------------------------------------------------
// Concurrency mapping helper
// ---------------------------------------------------------------------------

/**
 * Concurrently maps an array of items using an async function,
 * limiting active operations to `concurrency`.
 */
async function mapConcurrent(items, concurrency, fn) {
  const results = [];
  const copies = items.map((item, index) => ({ item, index }));
  const workers = Array(concurrency).fill(null).map(async () => {
    while (copies.length > 0) {
      const task = copies.shift();
      if (!task) break;
      try {
        const res = await fn(task.item);
        results[task.index] = res;
      } catch (err) {
        log('ERROR', `Error processing item: ${err.message}`);
      }
    }
  });
  await Promise.all(workers);
  return results.filter(r => r !== undefined);
}

// ---------------------------------------------------------------------------
// Main pipeline
// ---------------------------------------------------------------------------

async function main() {
  log('SCRAPER', `Mode: ${DRY_RUN ? 'DRY-RUN' : 'LIVE'}`);
  log('SCRAPER', `API URL: ${API_URL}`);
  log('SCRAPER', `Source:  ${DIRECTO_URL}`);
  log('SCRAPER', '---');

  // ------ Step 1: Fetch and parse the listing page ------

  let listingHtml;
  try {
    listingHtml = await fetchText(DIRECTO_URL);
  } catch (err) {
    log('SCRAPER', `FATAL — Could not fetch listing page: ${err.message}`);
    process.exit(1);
  }

  const matchLinks = parseListingPage(listingHtml);
  log('SCRAPER', `Found ${matchLinks.length} match(es) on listing page`);

  if (matchLinks.length === 0) {
    log('SCRAPER', 'Nothing to do — exiting.');
    return;
  }

  // ------ Step 2: Fetch each match detail page for streams ------

  log('SCRAPER', `Fetching details for ${matchLinks.length} matches concurrently (concurrency = 3)...`);

  const partidos = await mapConcurrent(matchLinks, 3, async ({ href, title }) => {
    log('MATCH', `Processing: "${title}"  →  ${href}`);

    try {
      const { local, visitante, time } = parseTitle(title);
      const sport = detectSport(href);
      const competition = extractCompetition(href);
      const hora = buildIsoDatetime(time);

      log('MATCH', `  Local: ${local || '—'}`);
      if (visitante) log('MATCH', `  Visitante: ${visitante}`);
      log('MATCH', `  Time: ${time || '—'}  →  ${hora || '—'}`);
      log('MATCH', `  Sport: ${sport}`);
      log('MATCH', `  Competition: ${competition}`);

      // Fetch detail page
      await sleep(100);

      let detailHtml;
      try {
        const detailUrl = href.startsWith('http') ? href : `${BASE_URL}${href}`;
        detailHtml = await fetchText(detailUrl);
      } catch (err) {
        log('STREAM', `  ⚠ Could not fetch detail page: ${err.message}`);
        // Still add the match without streams
        return buildPartido(local, visitante, hora, competition, sport, []);
      }

      const channels = parseDetailPage(detailHtml);
      log('STREAM', `  Found ${channels.length} UCASTER channel(s): ${channels.join(', ') || '(none)'}`);

      return buildPartido(local, visitante, hora, competition, sport, channels);
    } catch (err) {
      log('MATCH', `  ✖ Error processing match: ${err.message}`);
      return null;
    }
  });

  const validPartidos = partidos.filter(p => p !== null);

  log('SCRAPER', '---');
  log('SCRAPER', `Total matches scraped: ${validPartidos.length}`);

  // ------ Build payload ------

  const payload = { partidos: validPartidos };

  if (DRY_RUN) {
    log('SYNC', 'DRY-RUN — payload that would be sent:');
    console.log(JSON.stringify(payload, null, 2));
    return;
  }

  // ------ POST to sync API ------

  try {
    log('SYNC', `POSTing ${validPartidos.length} match(es) to ${API_URL}/api/partidos/sync`);
    const res = await fetch(`${API_URL}/api/partidos/sync`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_TOKEN}`,
      },
      body: JSON.stringify(payload),
    });

    const body = await res.text();
    if (!res.ok) {
      log('SYNC', `✖ API responded with HTTP ${res.status}: ${body}`);
      process.exit(1);
    }

    log('SYNC', `✔ API responded with HTTP ${res.status}`);
    log('SYNC', body);
  } catch (err) {
    log('SYNC', `✖ Failed to POST to API: ${err.message}`);
    process.exit(1);
  }
}

// ---------------------------------------------------------------------------
// Payload builder
// ---------------------------------------------------------------------------

/**
 * Build a single partido object matching the sync API schema.
 * Supports up to 2 UCASTER channels.
 */
function buildPartido(local, visitante, hora, competicion, deporte, channels) {
  return {
    local: local || '',
    visitante: visitante || '',
    hora: hora,
    estado: 'Live',
    competicion: competicion,
    deporte: deporte,
    ucaster_id_1: channels[0] || null,
    ucaster_script_1: channels[0] ? UCASTER_SCRIPT : null,
    ucaster_id_2: channels[1] || null,
    ucaster_script_2: channels[1] ? UCASTER_SCRIPT : null,
  };
}

// ---------------------------------------------------------------------------
// Run
// ---------------------------------------------------------------------------

main().catch((err) => {
  log('SCRAPER', `Unhandled error: ${err.message}`);
  console.error(err);
  process.exit(1);
});
