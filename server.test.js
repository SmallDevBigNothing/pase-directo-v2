const crypto = require('crypto');
// We must set NODE_ENV to test before requiring the file
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test-secret';
const { signValue, createSignedCookie, verifySignedCookie, COOKIE_SECRET } = require('./server.js');

describe('Signed Cookies Authentication', () => {
    it('should correctly sign a value', () => {
        const val = 'testuser';
        const expectedSig = crypto.createHmac('sha256', COOKIE_SECRET).update(val).digest('base64url');
        expect(signValue(val)).toBe(expectedSig);
    });

    it('should create a valid signed cookie string', () => {
        const val = 'testuser';
        const cookie = createSignedCookie(val);
        expect(cookie).toContain(`${val}.`);
        expect(cookie.split('.').length).toBe(2);
    });

    describe('verifySignedCookie', () => {
        it('should return the value for a valid signed cookie', () => {
            const val = 'admin';
            const cookie = createSignedCookie(val);
            expect(verifySignedCookie(cookie)).toBe(val);
        });

        it('should return null for undefined or null input', () => {
            expect(verifySignedCookie(undefined)).toBeNull();
            expect(verifySignedCookie(null)).toBeNull();
            expect(verifySignedCookie('')).toBeNull();
        });

        it('should return null for string without period separator', () => {
            expect(verifySignedCookie('admin_no_signature')).toBeNull();
        });

        it('should return null for tampered signature', () => {
            const val = 'admin';
            const cookie = createSignedCookie(val);
            // Modify the signature
            const tamperedCookie = cookie.substring(0, cookie.length - 1) + (cookie.charAt(cookie.length - 1) === 'a' ? 'b' : 'a');
            expect(verifySignedCookie(tamperedCookie)).toBeNull();
        });

        it('should return null for tampered value', () => {
            const val = 'admin';
            const cookie = createSignedCookie(val);
            // Replace the value with something else but keep the signature for "admin"
            const tamperedCookie = 'superuser' + cookie.substring(val.length);
            expect(verifySignedCookie(tamperedCookie)).toBeNull();
        });

        it('should handle values that naturally contain periods', () => {
            const val = 'user.name@example.com';
            const cookie = createSignedCookie(val);
            expect(verifySignedCookie(cookie)).toBe(val);
        });

        it('should handle empty value string', () => {
            const val = '';
            const cookie = createSignedCookie(val);
            expect(verifySignedCookie(cookie)).toBe(val);
        });

        it('should handle signature length mismatch safely without throwing', () => {
            const val = 'admin';
            const cookie = createSignedCookie(val);
            // Remove a character from signature
            const tamperedCookie = cookie.substring(0, cookie.length - 1);

            // Should not throw, should just return null
            expect(() => verifySignedCookie(tamperedCookie)).not.toThrow();
            expect(verifySignedCookie(tamperedCookie)).toBeNull();
        });
    });
});
