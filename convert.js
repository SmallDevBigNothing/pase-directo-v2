const fs = require('fs');
let content = fs.readFileSync('server.js', 'utf-8');
content = content.replace(/const app = express\(\);/, "const app = express();\napp.set('view engine', 'ejs');");

// The admin route should be replaced with `res.render('admin', { ...data });`
// The admin route spans from line 1392 to 2064.

const adminRouteRegex = /app\.get\('\/admin', requireAuth, async \(req, res\) => \{[\s\S]*?res\.send\(html\);\n\}\);/;
const replacement = `app.get('/admin', requireAuth, async (req, res) => {
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
            const key = \`\${r.partido_id}\`;
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
});`;

content = content.replace(adminRouteRegex, replacement);
fs.writeFileSync('server.js', content);
