const fs = require('fs');
let content = fs.readFileSync('views/admin.ejs', 'utf-8');

const regex = /<% if \(Object\.keys\(reportCounts\)\.length === 0\) \{ %>\n\s*\? '<p class="empty-reports">No reports at this time\.<\/p>'\n\s*: Object\.entries\(reportCounts\)\.map\(\(\[matchId, info\]\) => \{\n\s*const match = matches\.find\(m => m\.id === matchId\);\n\s*if \(!match\) return; \n\s*const channelDetails = Object\.entries\(info\.channels\)\.map\(\(\[ch, count\]\) => `Source \$\{ch\}: \$\{count\}`\)\.join\(', '\);\n\s*\n\s*<div class="report-item" id="report-<%= matchId %>">\n\s*<div class="report-info">\n\s*<div class="report-match"><%= escapeHtml\(match\.local\) %><%- match\.visitante \? " vs " \+ escapeHtml\(match\.visitante\) : "" %><\/div>\n\s*<div class="report-detail"><%= channelDetails %><\/div>\n\s*<\/div>\n\s*<span class="report-count"><%= info\.total %><\/span>\n\s*<button class="btn-clear" onclick="clearReports\('<%= matchId %>'\)">Clear<\/button>\n\s*<\/div>\n\s*\}\)\.join\(''\)\n\s*\}/g;

const replacement = `<% if (Object.keys(reportCounts).length === 0) { %>
    <p class="empty-reports">No reports at this time.</p>
<% } else { %>
    <% Object.entries(reportCounts).forEach(([matchId, info]) => {
        const match = matches.find(m => m.id === matchId);
        if (!match) return;
        const channelDetails = Object.entries(info.channels).map(([ch, count]) => \`Source \${ch}: \${count}\`).join(', ');
    %>
    <div class="report-item" id="report-<%= matchId %>">
        <div class="report-info">
            <div class="report-match"><%= escapeHtml(match.local) %><%- match.visitante ? " vs " + escapeHtml(match.visitante) : "" %></div>
            <div class="report-detail"><%= channelDetails %></div>
        </div>
        <span class="report-count"><%= info.total %></span>
        <button class="btn-clear" onclick="clearReports('<%= matchId %>')">Clear</button>
    </div>
    <% }); %>
<% } %>`;

content = content.replace(regex, replacement);
fs.writeFileSync('views/admin.ejs', content);
