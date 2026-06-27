## 2026-06-27 - [CRITICAL] Fixed Hardcoded Secrets and XSS Vulnerability
**Vulnerability:** Found fallback hardcoded passwords for 'ADMIN_PASSWORD' and 'SESSION_SECRET'. Also found an XSS vulnerability where match data was unsafely injected into an HTML 'onclick' handler in 'server.js'.
**Learning:** This application generates HTML server-side without a templating engine to do auto-escaping. Hardcoded fallback secrets are an anti-pattern as they bypass security if an environment variable isn't set.
**Prevention:** Ensured 'ADMIN_PASSWORD' and 'SESSION_SECRET' are enforced securely without fallback defaults. For XSS, used JSON serialization combined with the custom 'escapeHtml' function for safely injecting structured data into inline JavaScript attributes.
