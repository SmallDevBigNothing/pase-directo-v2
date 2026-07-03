
## 2026-07-03 - Missing Semantic Linkages in Raw HTML Strings
**Learning:** Because the app uses raw HTML strings for server-side rendering (e.g., inside server.js) without a component framework, semantic HTML attributes like id/for linkages and aria-labels are frequently missed. Proactively checking <button> and <input> elements in these strings is necessary to ensure accessibility attributes are correctly implemented.
**Action:** Always inspect raw HTML template literals for interactive elements and add missing ARIA labels and id/for associations where appropriate.
