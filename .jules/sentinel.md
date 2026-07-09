## 2024-07-09 - Fix hardcoded security fallbacks
**Vulnerability:** Hardcoded environment variables (`SESSION_SECRET` and `ADMIN_PASSWORD`) were present in `server.js`, posing severe security risks if production variables were missed.
**Learning:** This codebase incorrectly relied on hardcoded string fallbacks for critical security settings which would inadvertently leave the application in an insecure state in production rather than safely failing to start or failing access.
**Prevention:** Ensure explicit absence checks and throw exceptions or restrict access if sensitive environment variables are missing; avoid fallback string secrets.
