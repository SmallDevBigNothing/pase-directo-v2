## 2024-05-24 - [Intl.DateTimeFormat Server-side Bottleneck]
**Learning:** Instantiating `Intl.DateTimeFormat` inside loop-bound helper functions (like `formatMatchDate`) during server-side rendering is an architectural performance bottleneck, as formatter objects are extremely expensive to create.
**Action:** Always extract and cache expensive JavaScript objects (e.g. `Intl.*` formatters) to module-level constants in `server.js` rather than recreating them per item/request.
