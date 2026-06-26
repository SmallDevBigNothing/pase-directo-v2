const { describe, it } = require('node:test');
const assert = require('node:assert');
const { parseListingPage } = require('./sync-tiroalpalo.js');

describe('parseListingPage', () => {
  it('should return matches for valid links with time format in title', () => {
    const html = `
      <ul>
        <li><a href="/futbol/mundial-2026/partido"><h3>Match 1 (21:00)</h3></a></li>
      </ul>
    `;
    const result = parseListingPage(html);
    assert.deepStrictEqual(result, [
      { href: '/futbol/mundial-2026/partido', title: 'Match 1 (21:00)' }
    ]);
  });

  it('should ignore links not starting with / or exactly /directo', () => {
    const html = `
      <ul>
        <li><a href="futbol/mundial-2026/partido">Match 1 (21:00)</a></li>
        <li><a href="/directo">Directo (21:00)</a></li>
        <li><a href="/futbol/mundial-2026/partido2">Match 2 (21:00)</a></li>
      </ul>
    `;
    const result = parseListingPage(html);
    assert.deepStrictEqual(result, [
      { href: '/futbol/mundial-2026/partido2', title: 'Match 2 (21:00)' }
    ]);
  });

  it('should normalize absolute URLs starting with http:// or https://', () => {
    const html = `
      <ul>
        <li><a href="https://tiroalpalof.org/futbol/mundial-2026/partido">Match 1 (21:00)</a></li>
      </ul>
    `;
    const result = parseListingPage(html);
    assert.deepStrictEqual(result, [
      { href: '/futbol/mundial-2026/partido', title: 'Match 1 (21:00)' }
    ]);
  });

  it('should ignore absolute URLs that fail parsing', () => {
    const html = `
      <ul>
        <li><a href="https://[invalid-url]/futbol/mundial-2026/partido">Match 1 (21:00)</a></li>
      </ul>
    `;
    const result = parseListingPage(html);
    assert.deepStrictEqual(result, []);
  });

  it('should ignore titles without a time format', () => {
    const html = `
      <ul>
        <li><a href="/futbol/mundial-2026/partido">Match 1</a></li>
        <li><a href="/futbol/mundial-2026/partido2">Match 2 (21:00)</a></li>
      </ul>
    `;
    const result = parseListingPage(html);
    assert.deepStrictEqual(result, [
      { href: '/futbol/mundial-2026/partido2', title: 'Match 2 (21:00)' }
    ]);
  });

  it('should handle stripping HTML tags from inner content', () => {
    const html = `
      <ul>
        <li><a href="/futbol/mundial-2026/partido"><b>Match 1</b> <i>(21:00)</i></a></li>
      </ul>
    `;
    const result = parseListingPage(html);
    assert.deepStrictEqual(result, [
      { href: '/futbol/mundial-2026/partido', title: 'Match 1 (21:00)' }
    ]);
  });

  it('should handle deduplication of identical href values', () => {
    const html = `
      <ul>
        <li><a href="/futbol/mundial-2026/partido">Match 1 (21:00)</a></li>
        <li><a href="/futbol/mundial-2026/partido">Match 1 duplicate (21:00)</a></li>
        <li><a href="/futbol/mundial-2026/partido2">Match 2 (21:30)</a></li>
      </ul>
    `;
    const result = parseListingPage(html);
    assert.deepStrictEqual(result, [
      { href: '/futbol/mundial-2026/partido', title: 'Match 1 (21:00)' },
      { href: '/futbol/mundial-2026/partido2', title: 'Match 2 (21:30)' }
    ]);
  });
});
