const { parseCookies } = require('./server.js');

describe('parseCookies', () => {
    it('returns an empty object when header is undefined', () => {
        expect(parseCookies(undefined)).toEqual({});
    });

    it('returns an empty object when header is null', () => {
        expect(parseCookies(null)).toEqual({});
    });

    it('returns an empty object when header is an empty string', () => {
        expect(parseCookies('')).toEqual({});
    });

    it('parses a single cookie correctly', () => {
        expect(parseCookies('name=value')).toEqual({ name: 'value' });
    });

    it('parses multiple cookies separated by semicolon and space', () => {
        expect(parseCookies('name=value; foo=bar; hello=world')).toEqual({
            name: 'value',
            foo: 'bar',
            hello: 'world'
        });
    });

    it('handles cookies with equals sign in the value', () => {
        expect(parseCookies('name=value=with=equals')).toEqual({ name: 'value=with=equals' });
    });

    it('decodes URI encoded cookie values', () => {
        expect(parseCookies('name=hello%20world%21')).toEqual({ name: 'hello world!' });
    });

    it('handles cookies with trailing semicolons', () => {
        expect(parseCookies('name=value;')).toEqual({ name: 'value' });
    });

    it('trims whitespace around cookie names', () => {
        expect(parseCookies(' name =value;  foo =bar')).toEqual({ name: 'value', foo: 'bar' });
    });
});
