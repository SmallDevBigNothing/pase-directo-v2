## 2024-07-04 - Cache Intl.DateTimeFormat for Server-Side Rendering
**Learning:** Instantiating `Intl.DateTimeFormat` or using `Date.prototype.toLocaleDateString` implicitly creates a new formatter instance on each call. Inside server-side rendering loops (like rendering lists of matches), this repeated instantiation creates a significant performance bottleneck and excessive memory allocation.
**Action:** Always cache `Intl.DateTimeFormat` instances as module-level constants for formatters that are reused frequently, especially in SSR loops.
