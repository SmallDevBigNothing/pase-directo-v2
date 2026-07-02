## 2024-11-20 - Intl.DateTimeFormat instantiation performance bottleneck
**Learning:** Instantiating `Intl.DateTimeFormat` and repeatedly invoking `toLocaleDateString` (which creates internal formatters) inside loop-bound helper functions like `formatMatchDate` during server-side rendering of lists creates a significant performance bottleneck.
**Action:** Cache expensive objects like `Intl.DateTimeFormat` as module-level constants rather than repeatedly instantiating them per item in a list.
