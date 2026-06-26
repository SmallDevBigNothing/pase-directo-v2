const crypto = require('crypto');
const COOKIE_SECRET = process.env.SESSION_SECRET || 'futbol-secreto-2026';

function signValue(value) {
    return crypto.createHmac('sha256', COOKIE_SECRET).update(value).digest('base64url');
}

function createSignedCookie(value) {
    const sig = signValue(value);
    return `${value}.${sig}`;
}
console.log(createSignedCookie('authenticated'));
