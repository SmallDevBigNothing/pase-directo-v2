function renderHomeView({
    liveMatches,
    upcomingMatches,
    liveGroups,
    upcomingGroups,
    allSports,
    sportIcons,
    getSportIcon,
    SHARED_CSS,
    escapeHtml,
    teamAvatarHTML,
    formatMatchDate
}) {
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

    return `<!DOCTYPE html>
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
            background: var(--border);
            opacity: 0.5;
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
            padding: 22px;
            display: flex;
            flex-direction: column;
            gap: 18px;
            transition: all var(--transition);
            position: relative;
            overflow: hidden;
            box-shadow: 0 4px 20px rgba(0,0,0,0.2);
        }
        .match-card::before {
            content: "";
            position: absolute;
            top: 0; left: 0; right: 0; height: 100%;
            background: linear-gradient(180deg, rgba(255,255,255,0.03) 0%, transparent 100%);
            pointer-events: none;
            opacity: 0;
            transition: opacity var(--transition);
        }
        .match-card:hover {
            transform: translateY(-4px) scale(1.01);
            border-color: var(--border-hover);
            box-shadow: var(--shadow);
            background: rgba(30, 30, 45, 0.8);
        }
        .match-card:hover::before { opacity: 1; }
        .match-card-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            font-size: 0.75rem;
            font-weight: 600;
        }
        .match-tags {
            display: flex;
            gap: 8px;
            align-items: center;
        }
        .sport-tag {
            background: rgba(255,255,255,0.05);
            padding: 4px 10px;
            border-radius: 12px;
            color: var(--text-secondary);
            border: 1px solid var(--border);
        }
        .comp-tag {
            color: var(--text-muted);
        }
        .live-badge {
            background: rgba(229, 9, 20, 0.1);
            color: #ff3b47;
            padding: 4px 10px;
            border-radius: 12px;
            font-size: 0.7rem;
            font-weight: 800;
            display: flex;
            align-items: center;
            gap: 6px;
            border: 1px solid rgba(229, 9, 20, 0.2);
            box-shadow: 0 0 10px rgba(229, 9, 20, 0.1);
        }
        .live-dot {
            width: 6px; height: 6px;
            background: #ff3b47;
            border-radius: 50%;
            animation: pulse-live 1.5s infinite;
        }
        .match-teams {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 12px;
            flex: 1;
        }
        .team {
            display: flex;
            flex-direction: column;
            align-items: center;
            gap: 10px;
            flex: 1;
            text-align: center;
            max-width: 42%;
        }
        .team-logo {
            width: 48px; height: 48px;
            object-fit: contain;
            filter: drop-shadow(0 4px 8px rgba(0,0,0,0.3));
            transition: transform var(--transition);
        }
        .match-card:hover .team-logo { transform: scale(1.08); }
        .team-avatar {
            width: 48px; height: 48px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: 700;
            font-size: 1.2rem;
            color: white;
            box-shadow: 0 4px 12px rgba(0,0,0,0.3);
            text-shadow: 0 1px 3px rgba(0,0,0,0.5);
            border: 2px solid rgba(255,255,255,0.1);
            transition: transform var(--transition);
        }
        .match-card:hover .team-avatar { transform: scale(1.08); }
        .team-name {
            font-size: 0.95rem;
            font-weight: 600;
            line-height: 1.2;
            color: var(--text-primary);
            display: -webkit-box;
            -webkit-line-clamp: 2;
            -webkit-box-orient: vertical;
            overflow: hidden;
            text-overflow: ellipsis;
            word-break: break-word;
        }
        .vs {
            font-size: 0.8rem;
            font-weight: 800;
            color: var(--text-muted);
            text-transform: uppercase;
            background: rgba(255,255,255,0.03);
            padding: 4px 8px;
            border-radius: 8px;
        }
        .match-meta {
            text-align: center;
            font-size: 0.85rem;
            font-weight: 500;
            color: var(--text-secondary);
            padding: 8px 0;
            border-top: 1px dashed var(--border);
            border-bottom: 1px dashed var(--border);
        }
        .match-time { color: var(--text-secondary); }
        .countdown { color: var(--accent); font-weight: 600; font-variant-numeric: tabular-nums; }
        .match-action { margin-top: auto; }
        .btn {
            display: block;
            width: 100%;
            padding: 12px;
            text-align: center;
            border-radius: var(--radius-sm);
            font-weight: 700;
            font-size: 0.95rem;
            transition: all var(--transition);
            border: none;
            cursor: pointer;
        }
        .btn-live {
            background: var(--accent);
            color: white;
            box-shadow: 0 4px 15px rgba(229, 9, 20, 0.3);
        }
        .btn-live:hover {
            background: #ff202e;
            box-shadow: 0 6px 20px rgba(229, 9, 20, 0.4);
            transform: translateY(-2px);
        }
        .btn-upcoming {
            background: rgba(255,255,255,0.03);
            color: var(--text-muted);
            cursor: not-allowed;
            border: 1px solid var(--border);
        }
        .empty-state {
            text-align: center;
            padding: 40px;
            background: var(--bg-card);
            border-radius: var(--radius);
            border: 1px dashed var(--border);
            color: var(--text-muted);
            font-size: 0.95rem;
            grid-column: 1 / -1;
        }
        footer {
            text-align: center;
            padding: 30px;
            font-size: 0.85rem;
            color: var(--text-muted);
            border-top: 1px solid var(--border);
            background: rgba(10, 10, 15, 0.8);
        }
        .search-bar {
            margin-bottom: 20px;
            position: relative;
        }
        .search-bar input {
            width: 100%;
            background: var(--bg-card);
            border: 1px solid var(--border);
            color: var(--text-primary);
            padding: 14px 20px 14px 44px;
            border-radius: var(--radius-sm);
            font-size: 1rem;
            font-family: inherit;
            transition: border-color var(--transition), box-shadow var(--transition);
        }
        .search-bar input:focus {
            outline: none;
            border-color: rgba(255, 107, 53, 0.5);
            box-shadow: 0 0 0 4px rgba(255, 107, 53, 0.1);
        }
        .search-icon {
            position: absolute;
            left: 16px;
            top: 50%;
            transform: translateY(-50%);
            color: var(--text-muted);
            font-size: 1.1rem;
            pointer-events: none;
        }
        .sport-tabs {
            display: flex;
            gap: 12px;
            margin-bottom: 30px;
            overflow-x: auto;
            padding-bottom: 8px;
            scrollbar-width: none; /* Firefox */
        }
        .sport-tabs::-webkit-scrollbar { display: none; } /* Chrome */
        .sport-tab {
            background: rgba(255,255,255,0.03);
            border: 1px solid var(--border);
            color: var(--text-secondary);
            padding: 10px 18px;
            border-radius: 20px;
            font-size: 0.9rem;
            font-weight: 600;
            cursor: pointer;
            white-space: nowrap;
            transition: all var(--transition);
            display: flex;
            align-items: center;
            gap: 6px;
        }
        .sport-tab:hover {
            background: rgba(255,255,255,0.08);
            border-color: rgba(255,255,255,0.15);
            color: var(--text-primary);
        }
        .sport-tab.active {
            background: rgba(255, 107, 53, 0.15);
            border-color: rgba(255, 107, 53, 0.4);
            color: var(--text-primary);
        }
        .section-divider {
            border: 0;
            height: 1px;
            background: linear-gradient(90deg, transparent, var(--border), transparent);
            margin: 40px 0;
            opacity: 0.5;
        }
        /* Report Match Styles for Public View */
        .card-report-actions {
            display: flex;
            gap: 8px;
            margin-top: 10px;
        }
        .btn-report-card {
            flex: 1;
            background: rgba(255,255,255,0.03);
            border: 1px solid var(--border);
            color: var(--text-secondary);
            padding: 8px;
            border-radius: 6px;
            font-size: 0.75rem;
            font-weight: 600;
            cursor: pointer;
            transition: all var(--transition);
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
}

module.exports = renderHomeView;
