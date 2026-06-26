process.env.NODE_ENV = 'test';
const request = require('supertest');
const { app, signValue, verifySignedCookie } = require('../server');

describe('verifySignedCookie', () => {
  it('should handle malformed signatures (mismatched byte length) gracefully', async () => {
    const value = 'authenticated';
    const validSig = signValue(value);

    // Create an invalid signature that triggers the catch block in crypto.timingSafeEqual
    // by providing a string that has the same length but different byte length
    const sameCharLengthDifferentByteLength = 'á' + 'a'.repeat(validSig.length - 1);
    const cookie = `${value}.${sameCharLengthDifferentByteLength}`;

    const res = await request(app)
      .get('/admin')
      .set('Cookie', `pd_admin=${cookie}`);

    // If it threw an unhandled exception, it would return 500 or crash.
    // If it's handled properly, it should redirect to /admin/login because it's not verified.
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/admin/login');
  });

  it('should verify behavior of verifySignedCookie function explicitly for catch block', () => {
    const value = 'authenticated';
    const validSig = signValue(value);
    const sameCharLengthDifferentByteLength = 'á' + 'a'.repeat(validSig.length - 1);
    const cookie = `${value}.${sameCharLengthDifferentByteLength}`;

    const result = verifySignedCookie(cookie);
    expect(result).toBeNull();
  });

  it('should redirect if cookie is missing', async () => {
    const res = await request(app).get('/admin');
    expect(res.status).toBe(302);
    expect(res.headers.location).toBe('/admin/login');
  });
});
