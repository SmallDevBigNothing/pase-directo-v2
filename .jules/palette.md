## 2024-07-04 - Missing Semantic Linkages in SSR Strings
**Learning:** Because the app uses raw HTML strings for server-side rendering (e.g., inside `server.js`) without a component framework, semantic HTML attributes like `id`/`for` linkages and `aria-labels` are frequently missed on forms and icon-only buttons.
**Action:** Always proactively check `<button>` and `<input>` elements in these strings to ensure accessibility attributes are correctly implemented.
