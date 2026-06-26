describe('Signed Cookie Functions', () => {
    const originalEnv = process.env;
    let createSignedCookie, verifySignedCookie, signValue;

    beforeAll(() => {
        // Set NODE_ENV to test to prevent the server from starting automatically
        process.env.NODE_ENV = 'test';
        // Mock SESSION_SECRET before requiring
        process.env.SESSION_SECRET = 'test-secret';
        const server = require('../server.js');
        createSignedCookie = server.createSignedCookie;
        verifySignedCookie = server.verifySignedCookie;
        signValue = server.signValue;
    });

    afterAll(() => {
        process.env = originalEnv;
    });

    describe('createSignedCookie', () => {
        it('should create a signed cookie string in the format value.signature', () => {
            const value = 'test_value';

            const signedCookie = createSignedCookie(value);

            expect(typeof signedCookie).toBe('string');
            expect(signedCookie).toContain('.');

            const [cookieValue, cookieSig] = signedCookie.split('.');
            expect(cookieValue).toBe(value);
            expect(cookieSig).toBe(signValue(value));
        });

        it('should create different signatures for different values', () => {
             const cookie1 = createSignedCookie('value1');
             const cookie2 = createSignedCookie('value2');

             expect(cookie1).not.toBe(cookie2);
        });
    });

    describe('verifySignedCookie', () => {
        it('should correctly verify a valid signed cookie', () => {
            const value = 'valid_user';
            const signedCookie = createSignedCookie(value);

            const verifiedValue = verifySignedCookie(signedCookie);
            expect(verifiedValue).toBe(value);
        });

        it('should return null for null or undefined input', () => {
             expect(verifySignedCookie(null)).toBeNull();
             expect(verifySignedCookie(undefined)).toBeNull();
             expect(verifySignedCookie('')).toBeNull();
        });

        it('should return null if there is no dot in the cookie string', () => {
            expect(verifySignedCookie('invalidcookieformat')).toBeNull();
        });

        it('should return null if the signature does not match', () => {
            const value = 'valid_user';
            const signedCookie = createSignedCookie(value);

            // Tamper with the signature
            const tamperedCookie = signedCookie.slice(0, -1) + (signedCookie.endsWith('a') ? 'b' : 'a');

            const verifiedValue = verifySignedCookie(tamperedCookie);
            expect(verifiedValue).toBeNull();
        });

        it('should return null if the value is tampered with', () => {
            const value = 'valid_user';
            const signedCookie = createSignedCookie(value);

            // Tamper with the value
            const tamperedCookie = 'invalid_user' + signedCookie.substring(signedCookie.indexOf('.'));

            const verifiedValue = verifySignedCookie(tamperedCookie);
            expect(verifiedValue).toBeNull();
        });
    });
});
