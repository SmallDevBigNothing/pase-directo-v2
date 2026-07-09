## 2026-07-09 - Intl.DateTimeFormat Instantiation Bottleneck During SSR
**Learning:** Instantiating `Intl.DateTimeFormat` (or implicitly doing so via `toLocaleDateString`) inside a loop during server-side rendering is a hidden performance trap that blocks the main thread.
**Action:** Always cache and reuse `Intl.DateTimeFormat` instances as module-level constants when they are needed for formatting lists or invoked repeatedly.
