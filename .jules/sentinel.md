## 2026-07-08 - Fix XSS in inline event handlers
**Vulnerability:** Cross-Site Scripting (XSS) in server.js due to direct interpolation of user-controlled fields (like 'local' and 'visitante') into HTML event handler attributes (onclick) using simple regex escaping.
**Learning:** Due to the lack of an external templating engine that handles auto-escaping, string interpolation into HTML attributes via JavaScript template literals is highly fragile and prone to XSS if not serialized properly.
**Prevention:** When injecting complex data into HTML attributes via JavaScript template literals (e.g., onclick handlers), serialize the data with JSON.stringify and encode it using the internal escapeHtml helper to prevent XSS and ensure safe parsing by both the HTML parser and JS engine.
