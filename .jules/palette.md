## 2026-07-05 - Accessibility in Server-Rendered HTML Strings
**Learning:** Because the app uses raw HTML strings for server-side rendering (e.g., inside `server.js`) without a component framework, semantic HTML attributes like `id`/`for` linkages and `aria-labels` are frequently missed.
**Action:** Always proactively check `<button>` and `<input>` elements in these strings to ensure accessibility attributes are correctly implemented.
