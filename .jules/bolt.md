
## 2024-07-07 - Cached Intl.DateTimeFormat instantiation
**Learning:** Instantiating `Intl.DateTimeFormat` within frequently called functions (like `formatMatchDate` during server-side rendering of lists) creates a significant performance bottleneck. Even implicit instantiations like `Date.prototype.toLocaleDateString` suffer from this overhead.
**Action:** Always cache `Intl.DateTimeFormat` objects as module-level constants and reuse them across function calls to minimize overhead, especially in rendering loops.
