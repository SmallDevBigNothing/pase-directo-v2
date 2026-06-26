const crypto = require('crypto');
// Set dummy secret BEFORE importing app
process.env.SESSION_SECRET = crypto.randomBytes(16).toString('hex');
const app = require('./server');

describe('Cookie signing functions', () => {
    const expectedSecret = process.env.SESSION_SECRET;

    describe('signValue', () => {
        it('should correctly hash a string using the test secret', () => {
            const inputValue = 'test-value';
            const expectedHash = crypto.createHmac('sha256', expectedSecret).update(inputValue).digest('base64url');

            const result = app.signValue(inputValue);

            expect(result).toBe(expectedHash);
            expect(typeof result).toBe('string');
        });

        it('should always return the same hash for the same input', () => {
            const inputValue = 'consistent-value';
            const result1 = app.signValue(inputValue);
            const result2 = app.signValue(inputValue);

            expect(result1).toBe(result2);
        });
    });

    describe('createSignedCookie', () => {
        it('should return the original value combined with its signature', () => {
            const inputValue = 'admin-user';
            const signature = app.signValue(inputValue);
            const expectedCookie = `${inputValue}.${signature}`;

            const result = app.createSignedCookie(inputValue);

            expect(result).toBe(expectedCookie);
        });
    });

    describe('verifySignedCookie', () => {
        it('should return the value when given a valid signed cookie', () => {
            const inputValue = 'valid-user';
            const validCookie = app.createSignedCookie(inputValue);

            const result = app.verifySignedCookie(validCookie);

            expect(result).toBe(inputValue);
        });

        it('should return null when given an invalid signature', () => {
            const inputValue = 'invalid-user';
            const invalidCookie = `${inputValue}.invalid-signature-here`;

            const result = app.verifySignedCookie(invalidCookie);

            expect(result).toBeNull();
        });

        it('should return null when the cookie is not formatted correctly', () => {
            const result = app.verifySignedCookie('justastringwithoutdots');
            expect(result).toBeNull();
        });

        it('should return null when given a null or undefined cookie', () => {
            expect(app.verifySignedCookie(null)).toBeNull();
            expect(app.verifySignedCookie(undefined)).toBeNull();
            expect(app.verifySignedCookie('')).toBeNull();
        });
    });
});
