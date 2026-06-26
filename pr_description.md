🎯 **What:**
Added unit tests for the `verifySignedCookie`, `createSignedCookie`, and `signValue` functions in `server.js` to ensure the security and reliability of the stateless authentication system. Also added minor refactoring to conditional export internal components for testing purposes and suppress server listening on import during tests.

📊 **Coverage:**
The new test suite covers:
- Correctly signing a value and verifying expected signature strings.
- Creating a valid signed cookie string.
- Verifying correctly signed cookies.
- Handling malformed inputs (null, undefined, missing dots).
- Safely handling tampered signatures (invalid length, manipulated chars).
- Safely handling tampered values.
- Edge cases like empty values and values that naturally contain periods.

✨ **Result:**
Increased test coverage and confidence in the cookie validation logic. Refactored `server.js` cleanly to allow safe test isolation without automatically starting the Express server instance. All 10 tests are successfully passing.
