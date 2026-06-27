const m = { id: 1, local: "A", visitante: "B", estado: "Upcoming" };
const escapeHtml = function escapeHtml(str) {
    if (!str) return '';
    return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
console.log(`onclick='loadMatch(${escapeHtml(JSON.stringify(m))})'`);
