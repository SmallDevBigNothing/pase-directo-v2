const { escapeHtml } = require('./server');

describe('escapeHtml', () => {
    test('returns empty string for falsy values', () => {
        expect(escapeHtml('')).toBe('');
        expect(escapeHtml(null)).toBe('');
        expect(escapeHtml(undefined)).toBe('');
    });

    test('returns the original string if no special characters exist', () => {
        const str = 'Hello World 123!';
        expect(escapeHtml(str)).toBe(str);
    });

    test('escapes ampersand (&)', () => {
        expect(escapeHtml('Tom & Jerry')).toBe('Tom &amp; Jerry');
    });

    test('escapes less than (<)', () => {
        expect(escapeHtml('5 < 10')).toBe('5 &lt; 10');
    });

    test('escapes greater than (>)', () => {
        expect(escapeHtml('10 > 5')).toBe('10 &gt; 5');
    });

    test('escapes double quotes (")', () => {
        expect(escapeHtml('He said "Hello"')).toBe('He said &quot;Hello&quot;');
    });

    test('escapes single quotes (\')', () => {
        expect(escapeHtml("It's a beautiful day")).toBe('It&#39;s a beautiful day');
    });

    test('escapes multiple special characters in a string', () => {
        const input = '<script>alert("XSS & attack\'s")</script>';
        const expected = '&lt;script&gt;alert(&quot;XSS &amp; attack&#39;s&quot;)&lt;/script&gt;';
        expect(escapeHtml(input)).toBe(expected);
    });
});
