const assert = require('node:assert');
const { test, describe, it } = require('node:test');
const { escapeHtml } = require('./server');

describe('escapeHtml', () => {
    it('should return an empty string for falsy values', () => {
        assert.strictEqual(escapeHtml(null), '');
        assert.strictEqual(escapeHtml(undefined), '');
        assert.strictEqual(escapeHtml(''), '');
        assert.strictEqual(escapeHtml(0), '');
        assert.strictEqual(escapeHtml(false), '');
    });

    it('should escape HTML characters correctly', () => {
        assert.strictEqual(escapeHtml('<div>'), '&lt;div&gt;');
        assert.strictEqual(escapeHtml('"test"'), '&quot;test&quot;');
        assert.strictEqual(escapeHtml("'test'"), '&#39;test&#39;');
        assert.strictEqual(escapeHtml('a & b'), 'a &amp; b');
    });

    it('should return the original string if no HTML characters are present', () => {
        assert.strictEqual(escapeHtml('hello world'), 'hello world');
    });
});
