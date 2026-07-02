## 2025-02-17 - Missing Semantic HTML Attributes in Raw Strings
**Learning:** The app uses raw HTML strings for server-side rendering without a component framework. This architectural pattern frequently causes semantic HTML attributes like `id`/`for` linkages and `aria-labels` to be missed, leading to silent accessibility issues.
**Action:** Always proactively search for `<button>` and `<input>` elements in view files / HTML string templates to ensure appropriate `aria-label`, `for`, and `id` attributes are properly configured.
