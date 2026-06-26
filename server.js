const express = require('express');
const crypto = require('crypto');
const { createClient } = require('@supabase/supabase-js');

const app = express();
app.set('view engine', 'ejs');
const PORT = process.env.PORT || 3000;

// ============================================================
// --- SIGNED COOKIE AUTH (Stateless, Serverless-Safe) ---
// ============================================================
const COOKIE_SECRET = process.env.SESSION_SECRET || 'futbol-secreto-2026';
const COOKIE_NAME = 'pd_admin';
const COOKIE_MAX_AGE = 7 * 24 * 60 * 60; // 7 days in seconds

function signValue(value) {
    return crypto.createHmac('sha256', COOKIE_SECRET).update(value).digest('base64url');
}

function createSignedCookie(value) {
    const sig = signValue(value);
    return `${value}.${sig}`;
}

function verifySignedCookie(signed) {
    if (!signed) return null;
    const idx = signed.lastIndexOf('.');
    if (idx === -1) return null;
    const value = signed.substring(0, idx);
    const sig = signed.substring(idx + 1);
    const expected = signValue(value);
    try {
        if (sig.length === expected.length && crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expected))) {
            return value;
        }
    } catch (e) { /* length mismatch */ }
    return null;
}

function parseCookies(header) {
    const cookies = {};
    if (!header) return cookies;
    header.split(';').forEach(c => {
        const [name, ...rest] = c.split('=');
        if (name) cookies[name.trim()] = decodeURIComponent(rest.join('='));
    });
    return cookies;
}

// ============================================================
// --- SUPABASE CLIENT ---
// ============================================================
let supabase;
if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
    supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);
} else {
    console.warn("WARNING: SUPABASE_URL or SUPABASE_KEY not found. Using mock client for local testing.");
    
    // In-memory data store for local testing
    const mockMatches = [];
    
    const mockReports = [
        { id: 'report-1', partido_id: 'mock-uuid-2', canal: 1, created_at: new Date().toISOString() }
    ];

    // Helper to generate UUIDs
    const genUUID = () => 'mock-uuid-' + Math.random().toString(36).substring(2, 11);

    class MockBuilder {
        constructor(table) {
            this.table = table;
            this.filters = [];
            this.sortField = null;
            this.sortAscending = true;
            this.isSingle = false;
            this.action = 'select';
            this.payload = null;
        }
        select(fields) {
            if (this.action !== 'insert' && this.action !== 'update' && this.action !== 'delete') {
                this.action = 'select';
            }
            return this;
        }
        order(field, { ascending } = { ascending: true }) {
            this.sortField = field;
            this.sortAscending = ascending;
            return this;
        }
        eq(field, value) {
            this.filters.push({ type: 'eq', field, value });
            return this;
        }
        in(field, values) {
            this.filters.push({ type: 'in', field, values });
            return this;
        }
        single() {
            this.isSingle = true;
            return this;
        }
        insert(records) {
            this.action = 'insert';
            this.payload = records;
            return this;
        }
        update(fields) {
            this.action = 'update';
            this.payload = fields;
            return this;
        }
        delete() {
            this.action = 'delete';
            return this;
        }
        then(onFulfilled, onRejected) {
            let data = null;
            let error = null;

            if (this.action === 'select') {
                let list = this.table === 'partidos' ? mockMatches : mockReports;
                let result = list.filter(item => {
                    for (const f of this.filters) {
                        if (f.type === 'eq' && item[f.field] !== f.value) return false;
                        if (f.type === 'in' && !f.values.includes(item[f.field])) return false;
                    }
                    return true;
                });
                if (this.sortField) {
                    result.sort((a, b) => {
                        const valA = a[this.sortField];
                        const valB = b[this.sortField];
                        if (valA < valB) return this.sortAscending ? -1 : 1;
                        if (valA > valB) return this.sortAscending ? 1 : -1;
                        return 0;
                    });
                }
                data = this.isSingle ? (result[0] || null) : result;
                if (data && Array.isArray(data)) {
                    data = data.map(x => ({ ...x }));
                } else if (data) {
                    data = { ...data };
                }
            } else if (this.action === 'insert') {
                const list = this.table === 'partidos' ? mockMatches : mockReports;
                const inserted = [];
                const records = this.payload || [];
                for (const rec of records) {
                    const newRec = { id: rec.id || genUUID(), created_at: new Date().toISOString(), ...rec };
                    list.push(newRec);
                    inserted.push(newRec);
                }
                data = inserted;
            } else if (this.action === 'update') {
                let list = this.table === 'partidos' ? mockMatches : mockReports;
                list.forEach(item => {
                    let matchesAll = true;
                    for (const f of this.filters) {
                        if (f.type === 'eq' && item[f.field] !== f.value) matchesAll = false;
                        if (f.type === 'in' && !f.values.includes(item[f.field])) matchesAll = false;
                    }
                    if (matchesAll) {
                        Object.assign(item, this.payload);
                    }
                });
                data = null;
            } else if (this.action === 'delete') {
                let list = this.table === 'partidos' ? mockMatches : mockReports;
                const keep = list.filter(item => {
                    let matchesAll = true;
                    for (const f of this.filters) {
                        if (f.type === 'eq' && item[f.field] !== f.value) matchesAll = false;
                        if (f.type === 'in' && !f.values.includes(item[f.field])) matchesAll = false;
                    }
                    return !matchesAll;
                });
                if (this.table === 'partidos') {
                    mockMatches.length = 0;
                    mockMatches.push(...keep);
                } else {
                    mockReports.length = 0;
                    mockReports.push(...keep);
                }
                data = null;
            }

            return Promise.resolve({ data, error }).then(onFulfilled, onRejected);
        }
    }

    supabase = {
        from: (table) => new MockBuilder(table)
    };
}

// ============================================================
// --- MIDDLEWARE ---
// ============================================================
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

const requireAuth = (req, res, next) => {
    const cookies = parseCookies(req.headers.cookie);
    const verified = verifySignedCookie(cookies[COOKIE_NAME]);
    if (verified === 'authenticated') {
        next();
    } else {
        res.redirect('/admin/login');
    }
};

// ============================================================
// --- HELPER FUNCTIONS ---
// ============================================================
function formatMatchDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    const optionsTime = { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Madrid' };
    const optionsDate = { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Madrid' };

    const timeStr = new Intl.DateTimeFormat('en-US', optionsTime).format(date);

    const now = new Date();
    const getLocal = (d) => d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' });

    const todayStr = getLocal(now);
    const tomorrowStr = getLocal(new Date(now.getTime() + 86400000));
    const matchDayStr = getLocal(date);

    if (matchDayStr === todayStr) return `Today at ${timeStr}`;
    if (matchDayStr === tomorrowStr) return `Tomorrow at ${timeStr}`;

    let dateStr = new Intl.DateTimeFormat('en-US', optionsDate).format(date);
    dateStr = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
    return `${dateStr} at ${timeStr}`;
}

function getTeamColor(name) {
    let hash = 0;
    for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
    const h = Math.abs(hash) % 360;
    return `hsl(${h}, 55%, 40%)`;
}

function getTeamInitials(name) {
    return name.split(/\s+/).map(w => w[0]).join('').substring(0, 3).toUpperCase();
}

function teamAvatarHTML(name, logoUrl) {
    const color = getTeamColor(name || 'Team');
    const initials = getTeamInitials(name || 'Team');
    if (logoUrl) {
        return `<img class="team-logo" src="${logoUrl}" alt="${name}" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="team-avatar" style="background:${color};display:none">${initials}</div>`;
    }
    return `<img class="team-logo" data-auto-logo="${escapeHtml(name)}" alt="${name}" style="display:none" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><div class="team-avatar" style="background:${color}">${initials}</div>`;
}

function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

// ============================================================
// --- SHARED CSS ---
// ============================================================
const SHARED_CSS = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&display=swap');
    :root {
        --bg-primary: #05050a;
        --bg-secondary: rgba(13, 13, 22, 0.65);
        --bg-card: rgba(22, 22, 34, 0.45);
        --bg-card-hover: rgba(30, 30, 48, 0.7);
        --accent: #e50914;
        --accent-glow: rgba(229,9,20,0.4);
        --accent-secondary: #ff6b35;
        --gradient: linear-gradient(135deg, #ff1e27 0%, #ff7e40 100%);
        --text-primary: #f3f3f6;
        --text-secondary: #9494b0;
        --text-muted: #5e5e7a;
        --border: rgba(255, 255, 255, 0.05);
        --border-hover: rgba(255, 255, 255, 0.12);
        --glass: rgba(13, 13, 22, 0.7);
        --radius: 16px;
        --radius-sm: 10px;
        --transition: 0.3s cubic-bezier(0.25, 0.8, 0.25, 1);
        --shadow: 0 8px 30px rgba(0, 0, 0, 0.4);
        --shadow-glow: 0 0 20px rgba(229, 9, 20, 0.15);
    }
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        background: var(--bg-primary);
        color: var(--text-primary);
        line-height: 1.6;
        -webkit-font-smoothing: antialiased;
        position: relative;
        min-height: 100vh;
    }
    body::before {
        content: "";
        position: fixed;
        top: -10%;
        left: -10%;
        width: 120%;
        height: 120%;
        background: radial-gradient(circle at 15% 15%, rgba(229, 9, 20, 0.06) 0%, transparent 40%),
                    radial-gradient(circle at 85% 85%, rgba(255, 107, 53, 0.05) 0%, transparent 45%),
                    radial-gradient(circle at 50% 50%, rgba(13, 13, 22, 0.4) 0%, #05050a 100%);
        z-index: -1;
        pointer-events: none;
    }
    a { color: inherit; text-decoration: none; }
    @keyframes pulse-live {
        0%, 100% { opacity: 1; box-shadow: 0 0 0 0 var(--accent-glow); }
        50% { opacity: 0.6; box-shadow: 0 0 0 8px transparent; }
    }
    @keyframes fade-in { from { opacity: 0; transform: translateY(16px); } to { opacity: 1; transform: translateY(0); } }
    .container { max-width: 1200px; margin: 0 auto; padding: 0 20px; }
`;

// ============================================================
// --- PUBLIC ROUTES ---
// ============================================================

// Homepage
app.get('/', async (req, res) => {
    const { data: matches, error } = await supabase
        .from('partidos')
        .select('*')
        .order('hora', { ascending: true });

    if (error) {
        console.error('Error reading matches:', error);
        return res.status(500).send('Error loading matches.');
    }

    const liveMatches = matches.filter(m => m.estado === 'Live' && (m.ucaster_id_1 || m.ucaster_id_2));
    const upcomingMatches = matches.filter(m => m.estado === 'Upcoming' || (m.estado === 'Live' && !m.ucaster_id_1 && !m.ucaster_id_2));

    // Group by competition
    const groupByComp = (arr) => {
        const groups = {};
        arr.forEach(m => {
            const comp = m.competicion || 'Other';
            if (!groups[comp]) groups[comp] = [];
            groups[comp].push(m);
        });
        return groups;
    };

    const liveGroups = groupByComp(liveMatches);
    const upcomingGroups = groupByComp(upcomingMatches);

    // Collect unique sports for tabs
    const allSports = [...new Set(matches.map(m => m.deporte || 'Other'))].sort();

    // Sport icons map
    const sportIcons = {
        'Football': '⚽',
        'Basketball': '🏀',
        'Tennis': '🎾',
        'Formula 1': '🏎️',
        'MotoGP': '🏍️',
        'IndyCar': '🏎️',
        'Other': '🏆'
    };
    const getSportIcon = (s) => sportIcons[s] || '🏆';

    const renderCard = (m, isLive) => {
        let reportButtonsHtml = '';
        if (isLive) {
            const hasCh1 = !!m.ucaster_id_1;
            const hasCh2 = !!m.ucaster_id_2;
            if (hasCh1 || hasCh2) {
                reportButtonsHtml = `<div class="card-report-actions">`;
                if (hasCh1) {
                    reportButtonsHtml += `
                        <button class="btn-report-card" data-match="${m.id}" data-channel="1" onclick="reportCardStream('${m.id}', 1, this); event.preventDefault(); event.stopPropagation();">
                            ⚠ Report Ch 1
                        </button>`;
                }
                if (hasCh2) {
                    reportButtonsHtml += `
                        <button class="btn-report-card" data-match="${m.id}" data-channel="2" onclick="reportCardStream('${m.id}', 2, this); event.preventDefault(); event.stopPropagation();">
                            ⚠ Report Ch 2
                        </button>`;
                }
                reportButtonsHtml += `</div>`;
            }
        }

        const icon = getSportIcon(m.deporte || 'Football');

        return `
        <div class="match-card" data-sport="${escapeHtml(m.deporte || 'Other')}" style="animation: fade-in 0.4s ease both">
            <div class="match-card-header">
                <div class="match-tags">
                    <span class="sport-tag">${icon} ${escapeHtml(m.deporte || 'Other')}</span>
                    <span class="comp-tag">${escapeHtml(m.competicion || 'Other')}</span>
                </div>
                ${isLive ? '<span class="live-badge"><span class="live-dot"></span>LIVE</span>' : ''}
            </div>
            <div class="match-teams">
                <div class="team" ${!m.visitante ? 'style="max-width: 100%"' : ''}>
                    ${(!m.deporte || m.deporte === 'Football' || m.deporte === 'Basketball') ? teamAvatarHTML(m.local, m.logo_local) : ''}
                    <span class="team-name" ${!m.visitante ? 'style="white-space: normal;"' : ''}>${escapeHtml(m.local)}</span>
                </div>
                ${m.visitante ? `
                <span class="vs">vs</span>
                <div class="team">
                    ${(!m.deporte || m.deporte === 'Football' || m.deporte === 'Basketball') ? teamAvatarHTML(m.visitante, m.logo_visitante) : ''}
                    <span class="team-name">${escapeHtml(m.visitante)}</span>
                </div>` : ''}
            </div>
            <div class="match-meta">
                ${isLive
                    ? `<span class="match-time">${formatMatchDate(m.hora)}</span>`
                    : `<span class="countdown" data-kickoff="${m.hora || ''}">Loading...</span>`
                }
            </div>
            <div class="match-action">
                ${isLive
                    ? `<a href="/partido/${m.id}" class="btn btn-live">Watch Now</a>`
                    : `<div class="btn btn-upcoming">Upcoming</div>`
                }
                ${reportButtonsHtml}
            </div>
        </div>
        `;
    };

    const renderGroup = (groupName, matches, isLive) => `
        <div class="comp-section">
            <h3 class="comp-heading">${escapeHtml(groupName)}</h3>
            <div class="match-grid">
                ${matches.map(m => renderCard(m, isLive)).join('')}
            </div>
        </div>
    `;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Pase Directo — Live Sports Streaming</title>
    <meta name="description" content="Watch live sports for free. Stream football, basketball, tennis, Formula 1, MotoGP, IndyCar and more.">
    <style>
        ${SHARED_CSS}
        header {
            padding: 22px 0;
            border-bottom: 1px solid var(--border);
            background: var(--glass);
            position: sticky;
            top: 0;
            z-index: 100;
            backdrop-filter: blur(20px);
            -webkit-backdrop-filter: blur(20px);
            transition: background var(--transition);
        }
        .header-inner {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .logo {
            font-size: 1.6rem;
            font-weight: 800;
            letter-spacing: -0.8px;
            background: var(--gradient);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .stats-bar {
            display: flex;
            gap: 20px;
            font-size: 0.8rem;
            color: var(--text-secondary);
            background: rgba(255,255,255,0.02);
            padding: 6px 14px;
            border-radius: 20px;
            border: 1px solid var(--border);
        }
        .stats-bar .stat-value { font-weight: 700; color: var(--text-primary); }
        .stats-bar .live-count { color: #ff3b47; text-shadow: 0 0 10px rgba(255, 59, 71, 0.3); }
        main { padding: 40px 0 80px; }
        .section-header {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 24px;
            padding-bottom: 12px;
            border-bottom: 1px solid var(--border);
        }
        .section-header h2 {
            font-size: 1.4rem;
            font-weight: 800;
            letter-spacing: -0.4px;
            color: var(--text-primary);
        }
        .section-header .live-icon {
            width: 10px; height: 10px;
            background: var(--accent);
            border-radius: 50%;
            animation: pulse-live 1.8s infinite;
            box-shadow: 0 0 10px var(--accent);
        }
        .comp-section { margin-bottom: 36px; }
        .comp-heading {
            font-size: 0.78rem;
            font-weight: 700;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 1.5px;
            margin-bottom: 16px;
            padding-left: 2px;
            display: flex;
            align-items: center;
            gap: 8px;
        }
        .comp-heading::after {
            content: "";
            flex: 1;
            height: 1px;
            background: linear-gradient(90deg, var(--border) 0%, transparent 100%);
            margin-left: 12px;
        }
        .match-grid {
            display: grid;
            grid-template-columns: repeat(auto-fill, minmax(320px, 1fr));
            gap: 20px;
        }
        .match-card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: var(--radius);
            padding: 24px;
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            transition: transform var(--transition), border-color var(--transition), box-shadow var(--transition);
            display: flex;
            flex-direction: column;
            gap: 20px;
            position: relative;
        }
        .match-card:hover {
            transform: translateY(-5px);
            border-color: rgba(255, 255, 255, 0.15);
            box-shadow: 0 12px 40px rgba(0,0,0,0.5), 0 0 20px rgba(229, 9, 20, 0.1);
        }
        .match-card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        .match-tags {
            display: flex;
            gap: 6px;
            align-items: center;
        }
        .sport-tag {
            font-size: 0.65rem;
            font-weight: 700;
            color: var(--accent-secondary);
            text-transform: uppercase;
            letter-spacing: 0.8px;
            background: rgba(255, 107, 53, 0.08);
            padding: 3px 8px;
            border-radius: 4px;
        }
        .comp-tag {
            font-size: 0.65rem;
            font-weight: 700;
            color: var(--text-muted);
            text-transform: uppercase;
            letter-spacing: 0.8px;
            background: rgba(255,255,255,0.03);
            padding: 3px 8px;
            border-radius: 4px;
            border: 1px solid var(--border);
        }
        .live-badge {
            display: flex;
            align-items: center;
            gap: 6px;
            font-size: 0.7rem;
            font-weight: 800;
            color: var(--accent);
            text-transform: uppercase;
            letter-spacing: 1.2px;
            background: rgba(229, 9, 20, 0.1);
            padding: 4px 10px;
            border-radius: 20px;
            border: 1px solid rgba(229, 9, 20, 0.2);
        }
        .live-dot {
            width: 6px; height: 6px;
            background: var(--accent);
            border-radius: 50%;
            animation: pulse-live 1.8s infinite;
        }
        .match-teams {
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 16px;
            padding: 10px 0;
        }
        .team {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
            flex: 1;
            min-width: 0;
        }
        .team-logo {
            width: 56px; height: 56px;
            border-radius: 50%;
            object-fit: contain;
            background: rgba(255,255,255,0.03);
            border: 1px solid var(--border);
            padding: 6px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.25);
            transition: transform var(--transition);
        }
        .match-card:hover .team-logo {
            transform: scale(1.05);
        }
        .team-avatar {
            width: 56px; height: 56px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 0.85rem;
            font-weight: 800;
            color: white;
            letter-spacing: 0.5px;
            flex-shrink: 0;
            box-shadow: 0 4px 12px rgba(0,0,0,0.25);
            border: 1px solid rgba(255,255,255,0.1);
            transition: transform var(--transition);
        }
        .match-card:hover .team-avatar {
            transform: scale(1.05);
        }
        .team-name {
            font-size: 0.92rem;
            font-weight: 700;
            text-align: center;
            white-space: nowrap;
            overflow: hidden;
            text-overflow: ellipsis;
            max-width: 100%;
            color: var(--text-primary);
        }
        .vs {
            font-size: 0.72rem;
            font-weight: 800;
            color: var(--text-muted);
            text-transform: uppercase;
            flex-shrink: 0;
            background: rgba(255,255,255,0.02);
            width: 28px; height: 28px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            border: 1px solid var(--border);
        }
        .match-meta {
            text-align: center;
            font-size: 0.8rem;
            color: var(--text-secondary);
        }
        .countdown {
            font-variant-numeric: tabular-nums;
            font-weight: 700;
            color: var(--accent-secondary);
            letter-spacing: 0.5px;
            background: rgba(255, 107, 53, 0.08);
            padding: 4px 12px;
            border-radius: 20px;
            display: inline-block;
        }
        .match-action { 
            text-align: center; 
            display: flex;
            flex-direction: column;
            gap: 12px;
            margin-top: auto;
        }
        .btn {
            display: block;
            width: 100%;
            padding: 11px 24px;
            border-radius: var(--radius-sm);
            font-size: 0.9rem;
            font-weight: 700;
            transition: all var(--transition);
            border: none;
            cursor: pointer;
            text-align: center;
        }
        .btn-live {
            background: var(--gradient);
            color: white;
            box-shadow: 0 4px 16px rgba(255, 30, 39, 0.25);
        }
        .btn-live:hover {
            box-shadow: 0 6px 24px rgba(255, 30, 39, 0.45);
            transform: translateY(-1.5px);
        }
        .btn-upcoming {
            background: rgba(255,255,255,0.02);
            color: var(--text-muted);
            cursor: default;
            border: 1px solid var(--border);
        }
        .section-divider { margin: 48px 0; border: none; border-top: 1px solid var(--border); }
        .empty-state {
            text-align: center;
            color: var(--text-muted);
            font-style: italic;
            padding: 48px 0;
            font-size: 0.95rem;
        }
        .search-bar {
            margin-bottom: 32px;
            position: relative;
        }
        .search-bar input {
            width: 100%;
            padding: 14px 16px 14px 48px;
            border-radius: var(--radius);
            border: 1px solid var(--border);
            background: var(--bg-card);
            backdrop-filter: blur(12px);
            -webkit-backdrop-filter: blur(12px);
            color: var(--text-primary);
            font-size: 0.95rem;
            font-family: inherit;
            outline: none;
            transition: all var(--transition);
        }
        .search-bar input::placeholder { color: var(--text-muted); }
        .search-bar input:focus { 
            border-color: rgba(255, 30, 39, 0.4); 
            box-shadow: 0 0 0 3px rgba(255, 30, 39, 0.15), 0 8px 30px rgba(0, 0, 0, 0.3);
            background: var(--bg-card-hover);
        }
        .search-bar .search-icon {
            position: absolute;
            left: 16px;
            top: 50%;
            transform: translateY(-50%);
            color: var(--text-muted);
            font-size: 1.1rem;
        }
        footer {
            text-align: center;
            padding: 32px;
            color: var(--text-muted);
            font-size: 0.8rem;
            border-top: 1px solid var(--border);
            margin-top: 40px;
            background: rgba(0,0,0,0.2);
        }
        @media (max-width: 640px) {
            .match-grid { grid-template-columns: 1fr; }
            .stats-bar { display: none; }
            .logo { font-size: 1.35rem; }
            header { padding: 18px 0; }
            .section-header h2 { font-size: 1.2rem; }
            .sport-tabs { gap: 6px; }
            .sport-tab { padding: 6px 14px; font-size: 0.76rem; }
        }
        .sport-tabs {
            display: flex;
            gap: 10px;
            margin-bottom: 28px;
            flex-wrap: wrap;
        }
        .sport-tab {
            padding: 8px 18px;
            border-radius: 30px;
            font-size: 0.82rem;
            font-weight: 600;
            cursor: pointer;
            border: 1px solid var(--border);
            background: var(--bg-card);
            color: var(--text-secondary);
            transition: all var(--transition);
            font-family: inherit;
            letter-spacing: 0.3px;
            backdrop-filter: blur(8px);
            -webkit-backdrop-filter: blur(8px);
        }
        .sport-tab:hover {
            border-color: var(--border-hover);
            color: var(--text-primary);
            transform: translateY(-1px);
        }
        .sport-tab.active {
            background: var(--gradient);
            color: white;
            border-color: transparent;
            box-shadow: 0 4px 15px rgba(255, 30, 39, 0.35);
        }
        .card-report-actions {
            display: flex;
            gap: 8px;
            margin-top: 4px;
            justify-content: center;
            flex-wrap: wrap;
        }
        .btn-report-card {
            flex: 1;
            min-width: 100px;
            background: rgba(229, 9, 20, 0.06);
            color: #ef4444;
            border: 1px solid rgba(229, 9, 20, 0.15);
            padding: 6px 10px;
            font-size: 0.72rem;
            font-weight: 700;
            border-radius: var(--radius-sm);
            cursor: pointer;
            transition: all var(--transition);
            font-family: inherit;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 4px;
        }
        .btn-report-card:hover {
            background: rgba(229, 9, 20, 0.14);
            border-color: rgba(229, 9, 20, 0.35);
            color: #ff6b6b;
        }
        .btn-report-card:disabled {
            opacity: 0.4;
            cursor: not-allowed;
            background: rgba(255,255,255,0.01);
            color: var(--text-muted);
            border-color: var(--border);
        }
        .report-toast {
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 1001;
            background: rgba(15,15,25,0.95);
            backdrop-filter: blur(16px);
            -webkit-backdrop-filter: blur(16px);
            border: 1px solid rgba(255,255,255,0.08);
            color: #eee;
            padding: 14px 24px;
            border-radius: var(--radius-sm);
            font-size: 0.85rem;
            font-weight: 600;
            max-width: 320px;
            opacity: 0;
            transform: translateY(8px);
            transition: all var(--transition);
            pointer-events: none;
            box-shadow: 0 12px 40px rgba(0,0,0,0.6);
        }
        .report-toast.show { opacity: 1; transform: translateY(0); pointer-events: auto; }
        .report-toast.success { border-color: rgba(34, 197, 94, 0.4); }
        .report-toast.error { border-color: rgba(239, 68, 68, 0.4); }
    </style>
</head>
<body>
    <header>
        <div class="container header-inner">
            <div class="logo">⚡ Pase Directo</div>
            <div class="stats-bar">
                <span><span class="stat-value live-count">${liveMatches.length}</span> Live</span>
                <span><span class="stat-value">${upcomingMatches.length}</span> Upcoming</span>
            </div>
        </div>
    </header>

    <main class="container">
        <div class="search-bar">
            <span class="search-icon">&#128269;</span>
            <input type="text" id="search-input" placeholder="Search by team, competition or sport..." autocomplete="off">
        </div>

        ${allSports.length > 1 ? `
        <div class="sport-tabs" id="sport-tabs">
            <button class="sport-tab active" data-filter="all">🌐 All Sports</button>
            ${allSports.map(s => `<button class="sport-tab" data-filter="${escapeHtml(s)}">${getSportIcon(s)} ${escapeHtml(s)}</button>`).join('')}
        </div>` : ''}

        <section id="live-section">
            <div class="section-header">
                <div class="live-icon"></div>
                <h2>Live Now</h2>
            </div>
            ${Object.keys(liveGroups).length > 0
                ? Object.entries(liveGroups).map(([comp, m]) => renderGroup(comp, m, true)).join('')
                : '<p class="empty-state">No live matches right now.</p>'
            }
        </section>

        <hr class="section-divider">

        <section id="upcoming-section">
            <div class="section-header">
                <h2>&#128197; Upcoming Matches</h2>
            </div>
            ${Object.keys(upcomingGroups).length > 0
                ? Object.entries(upcomingGroups).map(([comp, m]) => renderGroup(comp, m, false)).join('')
                : '<p class="empty-state">No upcoming matches scheduled.</p>'
            }
        </section>
    </main>

    <footer>
        <div class="container">&copy; ${new Date().getFullYear()} Pase Directo. For personal use only.</div>
    </footer>

    <div class="report-toast" id="report-toast"></div>

    <script>
        // Countdown timers
        function updateCountdowns() {
            document.querySelectorAll('.countdown').forEach(function(el) {
                var kickoff = el.getAttribute('data-kickoff');
                if (!kickoff) { el.textContent = 'TBD'; return; }
                var diff = new Date(kickoff).getTime() - Date.now();
                if (diff <= 0) { el.textContent = 'Starting soon...'; return; }
                var d = Math.floor(diff / 86400000);
                var h = Math.floor((diff % 86400000) / 3600000);
                var m = Math.floor((diff % 3600000) / 60000);
                var s = Math.floor((diff % 60000) / 1000);
                var parts = [];
                if (d > 0) parts.push(d + 'd');
                parts.push(String(h).padStart(2,'0') + 'h');
                parts.push(String(m).padStart(2,'0') + 'm');
                parts.push(String(s).padStart(2,'0') + 's');
                el.textContent = 'Starts in ' + parts.join(' ');
            });
        }
        updateCountdowns();
        setInterval(updateCountdowns, 1000);

        // Search / Filter + Sport Tabs
        var searchInput = document.getElementById('search-input');
        var activeSport = 'all';

        function applyFilters() {
            var query = (searchInput ? searchInput.value : '').toLowerCase().trim();
            document.querySelectorAll('.match-card').forEach(function(card) {
                var text = card.textContent.toLowerCase();
                var sport = card.getAttribute('data-sport') || '';
                var matchesText = !query || text.includes(query);
                var matchesSport = activeSport === 'all' || sport === activeSport;
                card.style.display = (matchesText && matchesSport) ? '' : 'none';
            });
            // hide empty comp-sections
            document.querySelectorAll('.comp-section').forEach(function(sec) {
                var hasVisible = Array.from(sec.querySelectorAll('.match-card')).some(function(c) { return c.style.display !== 'none'; });
                sec.style.display = hasVisible ? '' : 'none';
            });
        }

        if (searchInput) {
            searchInput.addEventListener('input', applyFilters);
        }

        // Sport tab click handlers
        var sportTabs = document.getElementById('sport-tabs');
        if (sportTabs) {
            sportTabs.querySelectorAll('.sport-tab').forEach(function(tab) {
                tab.addEventListener('click', function() {
                    sportTabs.querySelectorAll('.sport-tab').forEach(function(t) { t.classList.remove('active'); });
                    tab.classList.add('active');
                    activeSport = tab.getAttribute('data-filter');
                    applyFilters();
                });
            });
        }

        // Report Stream from Card
        var COOLDOWN_MS = 300000; // 5 minutes

        function reportCardStream(matchId, canal, btn) {
            var storageKey = 'report_' + matchId + '_' + canal;
            var lastReport = localStorage.getItem(storageKey);

            if (lastReport && (Date.now() - parseInt(lastReport, 10)) < COOLDOWN_MS) {
                var remaining = Math.ceil((COOLDOWN_MS - (Date.now() - parseInt(lastReport, 10))) / 60000);
                showToast('Please wait ' + remaining + ' min before reporting again.', 'error');
                return;
            }

            btn.disabled = true;

            fetch('/api/partidos/' + matchId + '/report', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ canal: canal })
            })
            .then(function(r) { return r.json(); })
            .then(function(data) {
                if (data.success) {
                    localStorage.setItem(storageKey, String(Date.now()));
                    showToast('Report sent. Thank you!', 'success');
                    btn.disabled = true;
                    setTimeout(function() { btn.disabled = false; }, COOLDOWN_MS);
                } else {
                    showToast(data.error || 'Error sending report.', 'error');
                    btn.disabled = false;
                }
            })
            .catch(function() {
                showToast('Network error. Try again.', 'error');
                btn.disabled = false;
            });
        }

        function showToast(msg, type) {
            var toast = document.getElementById('report-toast');
            if (!toast) return;
            toast.textContent = msg;
            toast.className = 'report-toast show ' + type;
            setTimeout(function() { toast.className = 'report-toast'; }, 4000);
        }

        // Check cooldowns on load for all buttons
        function checkCooldowns() {
            document.querySelectorAll('.btn-report-card').forEach(function(btn) {
                var matchId = btn.getAttribute('data-match');
                var canal = btn.getAttribute('data-channel');
                var storageKey = 'report_' + matchId + '_' + canal;
                var lastReport = localStorage.getItem(storageKey);
                if (lastReport && (Date.now() - parseInt(lastReport, 10)) < COOLDOWN_MS) {
                    btn.disabled = true;
                    var remaining = COOLDOWN_MS - (Date.now() - parseInt(lastReport, 10));
                    setTimeout(function() { btn.disabled = false; }, remaining);
                }
            });
        }
        checkCooldowns();

        // Load Auto Logos dynamically from TheSportsDB
        function loadAutoLogos() {
            document.querySelectorAll('img[data-auto-logo]').forEach(function(img) {
                var teamName = img.getAttribute('data-auto-logo');
                if (!teamName) return;
                var cacheKey = 'logo_' + teamName.toLowerCase().replace(/[^a-z0-9]/g, '');
                var cachedLogo = localStorage.getItem(cacheKey);
                if (cachedLogo) {
                    if (cachedLogo === 'none') return;
                    img.src = cachedLogo;
                    img.style.display = 'block';
                    if (img.nextElementSibling) img.nextElementSibling.style.display = 'none';
                    return;
                }

                fetch('https://www.thesportsdb.com/api/v1/json/3/searchteams.php?t=' + encodeURIComponent(teamName))
                .then(function(r) { return r.json(); })
                .then(function(data) {
                    if (data.teams && data.teams[0] && data.teams[0].strBadge) {
                        var logoUrl = data.teams[0].strBadge;
                        if (logoUrl.indexOf('/preview') === -1) {
                            logoUrl += '/preview';
                        }
                        localStorage.setItem(cacheKey, logoUrl);
                        img.src = logoUrl;
                        img.style.display = 'block';
                        if (img.nextElementSibling) img.nextElementSibling.style.display = 'none';
                    } else {
                        localStorage.setItem(cacheKey, 'none');
                    }
                })
                .catch(function() {});
            });
        }
        loadAutoLogos();
    </script>
</body>
</html>`;
    res.send(html);
});

// ============================================================
// --- PLAYER PAGE ---
// ============================================================
app.get('/partido/:id', async (req, res) => {
    const { data: match, error } = await supabase
        .from('partidos')
        .select('*')
        .eq('id', req.params.id)
        .eq('estado', 'Live')
        .single();

    if (error || !match || (!match.ucaster_id_1 && !match.ucaster_id_2)) {
        return res.status(404).send(`<!DOCTYPE html><html><head><meta charset="UTF-8"><title>Not Found</title><style>body{font-family:'Inter',sans-serif;background:#06060b;color:#eee;display:flex;justify-content:center;align-items:center;height:100vh;margin:0;flex-direction:column;gap:16px}a{color:#e50914;font-weight:600}</style></head><body><h2>Match not found, not live, or missing stream sources.</h2><a href="/">Back to home</a></body></html>`);
    }

    // Build Ucaster sandboxed iframe blocks
    const iframeBlocks = [];
    if (match.ucaster_id_1) {
        iframeBlocks.push(`
            <iframe src="https://new.lastzone.top/hembedplayer/${match.ucaster_id_1}/1/1920/1080"
                    width="100%" height="100%" scrolling="no" frameborder="0" allowtransparency="true"
                    allowfullscreen sandbox="allow-scripts allow-same-origin allow-presentation"></iframe>
        `);
    }
    if (match.ucaster_id_2) {
        iframeBlocks.push(`
            <iframe src="https://new.lastzone.top/hembedplayer/${match.ucaster_id_2}/1/1920/1080"
                    width="100%" height="100%" scrolling="no" frameborder="0" allowtransparency="true"
                    allowfullscreen sandbox="allow-scripts allow-same-origin allow-presentation"></iframe>
        `);
    }

    const hasMultiSource = iframeBlocks.length > 1;

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>${escapeHtml(match.local)}${match.visitante ? ' vs ' + escapeHtml(match.visitante) : ''} — Pase Directo</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;600;700&display=swap');
        html, body { margin: 0; padding: 0; height: 100%; background: #000; overflow: hidden; font-family: 'Inter', sans-serif; }
        #video-wrapper { width: 100vw; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        #video-container { width: 100%; height: 100%; aspect-ratio: 16 / 9; max-height: calc(100vh - ${hasMultiSource ? '50px' : '0px'}); max-width: 100vw; position: relative; }
        #video-container > * { position: absolute; width: 100%; height: 100%; top: 0; left: 0; }
        .source-bar { display: flex; gap: 10px; padding: 8px; background: #111; width: 100%; justify-content: center; box-sizing: border-box; flex-shrink: 0; }
        .source-btn { background: #222; color: white; border: 1px solid #333; padding: 8px 20px; border-radius: 6px; cursor: pointer; font-size: 0.85rem; font-weight: 600; font-family: inherit; transition: all 0.2s; }
        .source-btn.active { background: #e50914; border-color: #e50914; }
        .source-btn:hover:not(.active) { background: #333; }

        /* Back button */
        .back-btn {
            position: fixed;
            top: 16px;
            left: 16px;
            z-index: 1000;
            background: rgba(30,30,30,0.7);
            backdrop-filter: blur(10px);
            -webkit-backdrop-filter: blur(10px);
            border: 1px solid rgba(255,255,255,0.08);
            color: #ccc;
            padding: 8px 14px;
            border-radius: 20px;
            cursor: pointer;
            font-size: 0.8rem;
            font-weight: 600;
            font-family: inherit;
            transition: all 0.25s;
            text-decoration: none;
            opacity: 0.6;
        }
        .back-btn:hover { opacity: 1; background: rgba(50,50,50,0.8); }
    </style>
</head>
<body>
    <a href="/" class="back-btn">&#8592; Back</a>

    <div id="video-wrapper">
        ${hasMultiSource ? `
        <div class="source-bar">
            <button class="source-btn active" onclick="switchSource(0, this)">Source 1</button>
            <button class="source-btn" onclick="switchSource(1, this)">Source 2</button>
        </div>` : ''}
        <div id="video-container">
            ${iframeBlocks[0] || '<p style="color:#555;text-align:center;margin-top:40vh">No stream source configured.</p>'}
        </div>
    </div>

    ${hasMultiSource ? `
    <script>
        var sources = ${JSON.stringify(iframeBlocks)};
        var activeSource = 0;
        function switchSource(index, btn) {
            activeSource = index;
            document.querySelectorAll('.source-btn').forEach(function(b) { b.classList.remove('active'); });
            btn.classList.add('active');
            var container = document.getElementById('video-container');
            container.innerHTML = sources[index];
        }
    </script>` : '<script>var activeSource = 0;</script>'}
</body>
</html>`;

    res.send(html);
});

// ============================================================
// --- PUBLIC API ROUTES ---
// ============================================================

// Report stream as down (anti-spam: max 50 per match+channel, client-side localStorage cooldown)
app.post('/api/partidos/:id/report', async (req, res) => {
    const canal = parseInt(req.body.canal, 10);
    if (canal !== 1 && canal !== 2) {
        return res.status(400).json({ success: false, error: 'Invalid channel.' });
    }

    // Server-side cap: max 50 reports per match+channel
    const { data: existing } = await supabase
        .from('reportes')
        .select('id')
        .eq('partido_id', req.params.id)
        .eq('canal', canal);

    if (existing && existing.length >= 50) {
        return res.json({ success: true, message: 'Report received.' }); // silently cap
    }

    const { error } = await supabase
        .from('reportes')
        .insert([{ partido_id: req.params.id, canal }]);

    if (error) {
        console.error('Error inserting report:', error);
        return res.status(500).json({ success: false, error: 'Database error.' });
    }

    return res.json({ success: true });
});

// ============================================================
// --- ADMIN API ROUTES (AJAX) ---
// ============================================================

// Toggle match status (Live <-> Upcoming)
app.post('/api/partidos/:id/toggle-status', requireAuth, async (req, res) => {
    // Get current status and channels
    const { data: match, error: fetchErr } = await supabase
        .from('partidos')
        .select('estado, ucaster_id_1, ucaster_id_2')
        .eq('id', req.params.id)
        .single();

    if (fetchErr || !match) {
        return res.status(404).json({ success: false, error: 'Match not found.' });
    }

    const newStatus = match.estado === 'Live' ? 'Upcoming' : 'Live';

    // Verify stream sources are present before setting status to Live
    if (newStatus === 'Live' && !match.ucaster_id_1 && !match.ucaster_id_2) {
        return res.status(400).json({ success: false, error: 'Cannot set match to Live without any stream sources configured.' });
    }

    const { error } = await supabase
        .from('partidos')
        .update({ estado: newStatus })
        .eq('id', req.params.id);

    if (error) {
        return res.status(500).json({ success: false, error: 'Update failed.' });
    }

    return res.json({ success: true, newStatus });
});

// Clear reports for a match
app.post('/api/partidos/:id/clear-reports', requireAuth, async (req, res) => {
    const { error } = await supabase
        .from('reportes')
        .delete()
        .eq('partido_id', req.params.id);

    if (error) {
        return res.status(500).json({ success: false, error: 'Delete failed.' });
    }

    return res.json({ success: true });
});

// ============================================================
// --- ADMIN AUTH ROUTES ---
// ============================================================

app.get('/admin/login', (req, res) => {
    const cookies = parseCookies(req.headers.cookie);
    if (verifySignedCookie(cookies[COOKIE_NAME]) === 'authenticated') return res.redirect('/admin');

    res.send(`<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Login — Pase Directo</title>
    <style>
        ${SHARED_CSS}
        body { display: flex; justify-content: center; align-items: center; min-height: 100vh; }
        .login-card {
            background: var(--bg-card);
            border: 1px solid var(--border);
            border-radius: 16px;
            padding: 40px;
            width: 100%;
            max-width: 380px;
            margin: 20px;
        }
        .login-card h1 {
            font-size: 1.5rem;
            font-weight: 700;
            margin-bottom: 8px;
            background: var(--gradient);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
            background-clip: text;
        }
        .login-card p { color: var(--text-secondary); font-size: 0.85rem; margin-bottom: 28px; }
        .input-group { margin-bottom: 20px; }
        .input-group label { display: block; font-size: 0.8rem; font-weight: 600; color: var(--text-secondary); margin-bottom: 6px; text-transform: uppercase; letter-spacing: 0.5px; }
        .input-group input {
            width: 100%;
            padding: 12px 14px;
            border: 1px solid var(--border);
            border-radius: var(--radius-sm);
            background: var(--bg-secondary);
            color: var(--text-primary);
            font-size: 0.95rem;
            font-family: inherit;
            outline: none;
            transition: border-color var(--transition);
        }
        .input-group input:focus { border-color: var(--accent); }
        .btn-login {
            width: 100%;
            padding: 12px;
            border: none;
            border-radius: var(--radius-sm);
            background: var(--gradient);
            color: white;
            font-size: 0.95rem;
            font-weight: 700;
            font-family: inherit;
            cursor: pointer;
            transition: all var(--transition);
        }
        .btn-login:hover { box-shadow: 0 4px 20px var(--accent-glow); transform: translateY(-1px); }
        .error-msg { color: var(--accent); font-size: 0.82rem; text-align: center; margin-top: 14px; }
    </style>
</head>
<body>
    <div class="login-card">
        <h1>Pase Directo</h1>
        <p>Enter your admin password to continue.</p>
        <form action="/admin/login" method="POST">
            <div class="input-group">
                <label>Password</label>
                <input type="password" name="password" placeholder="Enter password" required autofocus>
            </div>
            <button type="submit" class="btn-login">Sign In</button>
        </form>
        ${req.query.error ? '<p class="error-msg">Incorrect password. Try again.</p>' : ''}
    </div>
</body>
</html>`);
});

app.post('/admin/login', (req, res) => {
    const { password } = req.body;
    const adminPassword = process.env.ADMIN_PASSWORD || 'AdminFutbol2026';
    if (password === adminPassword) {
        const signed = createSignedCookie('authenticated');
        const secure = process.env.NODE_ENV === 'production' ? '; Secure' : '';
        res.setHeader('Set-Cookie', `${COOKIE_NAME}=${signed}; HttpOnly; Path=/; Max-Age=${COOKIE_MAX_AGE}; SameSite=Lax${secure}`);
        res.redirect('/admin');
    } else {
        res.redirect('/admin/login?error=1');
    }
});

app.get('/admin/logout', (req, res) => {
    res.setHeader('Set-Cookie', `${COOKIE_NAME}=; HttpOnly; Path=/; Max-Age=0`);
    res.redirect('/admin/login');
});

// ============================================================
// --- ADMIN DASHBOARD ---
// ============================================================
app.get('/admin', requireAuth, async (req, res) => {
    const { data: matches, error } = await supabase
        .from('partidos')
        .select('*')
        .order('hora', { ascending: true });

    if (error) {
        console.error('Error reading matches:', error);
        return res.status(500).send('Error loading admin panel.');
    }

    // Fetch report counts grouped by match
    const { data: reportRows } = await supabase
        .from('reportes')
        .select('partido_id, canal, created_at');

    const reportCounts = {};
    let totalReports = 0;
    if (reportRows) {
        reportRows.forEach(r => {
            const key = `${r.partido_id}`;
            if (!reportCounts[key]) reportCounts[key] = { total: 0, channels: {} };
            reportCounts[key].total++;
            reportCounts[key].channels[r.canal] = (reportCounts[key].channels[r.canal] || 0) + 1;
            totalReports++;
        });
    }

    const liveCount = matches.filter(m => m.estado === 'Live').length;
    const upcomingCount = matches.filter(m => m.estado === 'Upcoming').length;

    const competitions = ['LaLiga', 'Premier League', 'Champions League', 'Europa League', 'Serie A', 'Bundesliga', 'Ligue 1', 'Copa del Rey', 'Copa America', 'World Cup', 'Other'];

    res.render('admin', {
        matches,
        reportCounts,
        totalReports,
        liveCount,
        upcomingCount,
        competitions,
        SHARED_CSS,
        escapeHtml,
        formatMatchDate
    });
});

// Admin Stream Preview (loads player page without status check)
app.get('/admin/preview/:id', requireAuth, async (req, res) => {
    const { data: match, error } = await supabase
        .from('partidos')
        .select('*')
        .eq('id', req.params.id)
        .single();

    if (error || !match) {
        return res.status(404).send('Match not found.');
    }

    const iframeBlocks = [];
    if (match.ucaster_id_1) {
        iframeBlocks.push(`<iframe src="https://new.lastzone.top/hembedplayer/${match.ucaster_id_1}/1/1920/1080" width="100%" height="100%" scrolling="no" frameborder="0" allowtransparency="true" allowfullscreen sandbox="allow-scripts allow-same-origin allow-presentation"></iframe>`);
    }
    if (match.ucaster_id_2) {
        iframeBlocks.push(`<iframe src="https://new.lastzone.top/hembedplayer/${match.ucaster_id_2}/1/1920/1080" width="100%" height="100%" scrolling="no" frameborder="0" allowtransparency="true" allowfullscreen sandbox="allow-scripts allow-same-origin allow-presentation"></iframe>`);
    }

    const hasMulti = iframeBlocks.length > 1;

    const html = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>
    html,body{margin:0;padding:0;height:100%;background:#000;overflow:hidden;font-family:sans-serif}
    #vc{width:100%;height:${hasMulti?'calc(100% - 40px)':'100%'};position:relative}
    #vc>*{position:absolute;width:100%;height:100%;top:0;left:0}
    .sb{display:flex;gap:8px;padding:6px;background:#111;justify-content:center}
    .sb button{background:#222;color:#fff;border:1px solid #333;padding:6px 16px;border-radius:4px;cursor:pointer;font-size:0.8rem}
    .sb button.active{background:#e50914;border-color:#e50914}
    </style></head><body>
    ${hasMulti?'<div class="sb"><button class="active" onclick="sw(0,this)">Source 1</button><button onclick="sw(1,this)">Source 2</button></div>':''}
    <div id="vc">${iframeBlocks[0]||'<p style="color:#555;text-align:center;margin-top:40%">No stream configured.</p>'}</div>
    ${hasMulti?`<script>var S=${JSON.stringify(iframeBlocks)};function sw(i,b){document.querySelectorAll('.sb button').forEach(function(x){x.classList.remove('active')});b.classList.add('active');var c=document.getElementById('vc');c.innerHTML=S[i];}</script>`:''}
    </body></html>`;

    res.send(html);
});

// ============================================================
// --- ADMIN CRUD ACTIONS ---
// ============================================================

// Add Match
app.post('/admin/add', requireAuth, async (req, res) => {
    const { local, visitante, hora, estado, competicion, deporte, ucaster_id_1, ucaster_script_1, ucaster_id_2, ucaster_script_2, logo_local, logo_visitante } = req.body;

    const resolvedStatus = (estado === 'Live' && !ucaster_id_1 && !ucaster_id_2) ? 'Upcoming' : (estado || 'Upcoming');

    const { error } = await supabase.from('partidos').insert([{
        local: local || null,
        visitante: visitante || null,
        hora: hora || null,
        estado: resolvedStatus,
        competicion: competicion || 'Other',
        deporte: deporte || 'Football',
        ucaster_id_1: ucaster_id_1 || null,
        ucaster_script_1: ucaster_script_1 || null,
        ucaster_id_2: ucaster_id_2 || null,
        ucaster_script_2: ucaster_script_2 || null,
        logo_local: logo_local || null,
        logo_visitante: logo_visitante || null,
    }]);

    if (error) {
        console.error('Error inserting match:', error);
        return res.status(500).send('Error saving match. <a href="/admin">Go back</a>');
    }
    res.redirect('/admin');
});

// Edit Match
app.post('/admin/editar/:id', requireAuth, async (req, res) => {
    const { local, visitante, hora, estado, competicion, deporte, ucaster_id_1, ucaster_script_1, ucaster_id_2, ucaster_script_2, logo_local, logo_visitante } = req.body;

    const resolvedStatus = (estado === 'Live' && !ucaster_id_1 && !ucaster_id_2) ? 'Upcoming' : (estado || 'Upcoming');

    const { error } = await supabase.from('partidos')
        .update({
            local: local || null,
            visitante: visitante || null,
            hora: hora || null,
            estado: resolvedStatus,
            competicion: competicion || 'Other',
            deporte: deporte || 'Football',
            ucaster_id_1: ucaster_id_1 || null,
            ucaster_script_1: ucaster_script_1 || null,
            ucaster_id_2: ucaster_id_2 || null,
            ucaster_script_2: ucaster_script_2 || null,
            logo_local: logo_local || null,
            logo_visitante: logo_visitante || null,
        })
        .eq('id', req.params.id);

    if (error) {
        console.error('Error editing match:', error);
        return res.status(500).send('Error editing match. <a href="/admin">Go back</a>');
    }
    res.redirect('/admin');
});

// Delete Match
app.post('/admin/eliminar/:id', requireAuth, async (req, res) => {
    const { error } = await supabase.from('partidos').delete().eq('id', req.params.id);

    if (error) {
        console.error('Error deleting match:', error);
        return res.status(500).send('Error deleting match. <a href="/admin">Go back</a>');
    }
    res.redirect('/admin');
});

// ============================================================
// --- SYNC API (for Scraper/Mistral) ---
// ============================================================
app.post('/api/partidos/sync', async (req, res) => {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Missing token' });
    }
    const token = authHeader.substring(7);
    const expectedToken = process.env.SCRAPER_API_TOKEN || (process.env.NODE_ENV !== 'production' ? 'test-token-123' : null);

    if (!expectedToken) {
        console.error('Config error: SCRAPER_API_TOKEN is not set in production.');
        return res.status(500).json({ success: false, error: 'Server misconfiguration' });
    }

    if (token !== expectedToken) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
    }

    const { partidos } = req.body;
    if (!Array.isArray(partidos)) {
        return res.status(400).json({ success: false, error: 'Invalid payload, expected array of partidos' });
    }

    // Map legacy Spanish status values to English
    const statusMap = { 'En Directo': 'Live', 'Próximo Partido': 'Upcoming' };

    // Stale match cleanup: Delete matches in database that are currently 'Live',
    // have a ucaster_id_1 or ucaster_id_2 (meaning they were automatically scraped),
    // and are NOT in the incoming payload.
    try {
        const incomingMatchKeys = new Set(partidos.map(p => `${(p.local || '').toLowerCase()}||${(p.visitante || '').toLowerCase()}`));
        const { data: dbMatches, error: fetchError } = await supabase
            .from('partidos')
            .select('id, local, visitante, ucaster_id_1, ucaster_id_2')
            .eq('estado', 'Live');

        if (!fetchError && dbMatches) {
            const matchesToDelete = dbMatches.filter(m => {
                const isScraped = !!m.ucaster_id_1 || !!m.ucaster_id_2;
                const key = `${(m.local || '').toLowerCase()}||${(m.visitante || '').toLowerCase()}`;
                return isScraped && !incomingMatchKeys.has(key);
            });

            if (matchesToDelete.length > 0) {
                const idsToDelete = matchesToDelete.map(m => m.id);
                const { error: deleteError } = await supabase
                    .from('partidos')
                    .delete()
                    .in('id', idsToDelete);
                if (deleteError) {
                    console.error('Error deleting stale matches:', deleteError);
                } else {
                    console.log(`Deleted ${idsToDelete.length} stale live matches.`);
                }
            }
        }
    } catch (err) {
        console.error('Stale match cleanup error:', err);
    }

    const results = [];
    for (const p of partidos) {
        const { local, visitante, hora, estado, competicion, deporte, ucaster_id_1, ucaster_script_1, ucaster_id_2, ucaster_script_2 } = p;

        if (!local) continue;

        const normalizedStatus = statusMap[estado] || estado || 'Upcoming';
        const resolvedStatus = (normalizedStatus === 'Live' && !ucaster_id_1 && !ucaster_id_2) ? 'Upcoming' : normalizedStatus;

        const { data: existing, error: searchError } = await supabase
            .from('partidos')
            .select('id')
            .eq('local', local)
            .eq('visitante', visitante || '')
            .in('estado', ['Live', 'Upcoming']);

        if (searchError) {
            console.error('Error searching existing match:', searchError);
            continue;
        }

        const matchData = {
            local, visitante: visitante || '',
            hora: hora || null,
            estado: resolvedStatus,
            competicion: competicion || 'Other',
            deporte: deporte || 'Football',
            ucaster_id_1: ucaster_id_1 || null,
            ucaster_script_1: ucaster_script_1 || null,
            ucaster_id_2: ucaster_id_2 || null,
            ucaster_script_2: ucaster_script_2 || null,
        };

        if (existing && existing.length > 0) {
            const matchId = existing[0].id;
            const { error: updateError } = await supabase.from('partidos').update(matchData).eq('id', matchId);
            if (updateError) {
                console.error(`Error updating ${local} vs ${visitante}:`, updateError);
                results.push({ local, visitante, status: 'error', error: updateError.message });
            } else {
                results.push({ local, visitante, status: 'updated', id: matchId });
            }
        } else {
            const { data: insertedData, error: insertError } = await supabase.from('partidos').insert([matchData]).select('id');
            if (insertError) {
                console.error(`Error inserting ${local} vs ${visitante}:`, insertError);
                results.push({ local, visitante, status: 'error', error: insertError.message });
            } else {
                results.push({ local, visitante, status: 'inserted', id: insertedData?.[0]?.id });
            }
        }
    }

    return res.status(200).json({ success: true, processed: results });
});

// ============================================================
// --- SERVER STARTUP ---
// ============================================================
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Server running at http://localhost:${PORT}`);
    });
}

module.exports = app;
