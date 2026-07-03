
## 2024-07-03 - Cache Intl.DateTimeFormat Instances for SSR
**Learning:** Instantiating `new Intl.DateTimeFormat` and using `Date.prototype.toLocaleDateString` is significantly expensive and creates a substantial performance bottleneck in tight loops or repeated calls like Server-Side Rendering (SSR). In our app, lists of matches format dates frequently which slowed down performance.
**Action:** Always cache `Intl.DateTimeFormat` instances at the module level when formatting dates inside loops, map functions, or heavily used helper methods on the server.
