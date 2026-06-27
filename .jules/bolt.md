## 2024-06-27 - Frontend DOM Caching
**Learning:** The application renders HTML server-side with inline scripts. Frontend elements like `.countdown` and `.match-card` are present upon page load and not dynamically added by a client framework.
**Action:** When optimizing frontend `setInterval` or `addEventListener` loops in inline scripts, cache DOM query results (`document.querySelectorAll`) and parsed attributes (e.g. string dates parsed to timestamps) once at script initialization instead of doing it repeatedly in the loop.
