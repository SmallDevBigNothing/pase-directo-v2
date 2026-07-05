## 2024-05-18 - Avoid repeatedly instantiating Intl.DateTimeFormat
**Learning:** Creating `Intl.DateTimeFormat` inside loop-bound helper functions (or server-side rendering logic) like `formatMatchDate` and using `Date.prototype.toLocaleDateString` is very slow since it creates a new formatter instance every time it's called.
**Action:** Cache the `Intl.DateTimeFormat` instances as module-level constants and use them instead to speed up date formatting operations.
