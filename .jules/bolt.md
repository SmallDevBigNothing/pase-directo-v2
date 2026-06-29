## 2024-06-29 - Cache Intl.DateTimeFormat for performance
**Learning:** Instantiating `Intl.DateTimeFormat` repeatedly in loop-bound helper functions causes massive performance bottlenecks during server-side rendering.
**Action:** Always cache expensive objects like `Intl.DateTimeFormat` as module-level constants to avoid redundant instantiation in loops.
