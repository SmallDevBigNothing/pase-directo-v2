## 2026-07-10 - Cache Intl.DateTimeFormat Instances
**Learning:** Instantiating `Intl.DateTimeFormat` or implicitly doing so via `toLocaleDateString()` inside frequently called helper functions (like `formatMatchDate` in `server.js` or `buildIsoDatetime` in `scripts/sync-tiroalpalo.js`) introduces significant overhead in tight loops or heavy server-side rendering loads.
**Action:** Extract format configurations to module-level constants and reuse them across function invocations to eliminate instantiation overhead and reduce garbage collection pressure.
