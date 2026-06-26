const { describe, it } = require('node:test');
const assert = require('node:assert');
const { parseDetailPage } = require('./sync-tiroalpalo.js');

describe('parseDetailPage', () => {
  it('returns an empty array when no matching links are found', () => {
    const html = '<div><a href="https://example.com/stream1">Watch</a></div>';
    const result = parseDetailPage(html);
    assert.deepStrictEqual(result, []);
  });

  it('extracts a valid channel ID from an http or https link', () => {
    const htmlHttps = '<a href="https://new.lastzone.top/abc_def-123">Link 1</a>';
    const resultHttps = parseDetailPage(htmlHttps);
    assert.deepStrictEqual(resultHttps, ['abc_def-123']);

    const htmlHttp = '<a href="http://new.lastzone.top/xyZ-890">Link 2</a>';
    const resultHttp = parseDetailPage(htmlHttp);
    assert.deepStrictEqual(resultHttp, ['xyZ-890']);
  });

  it('extracts multiple distinct channel IDs', () => {
    const html = `
      <a href="https://new.lastzone.top/ch1">Link 1</a>
      <a href="http://new.lastzone.top/ch-2">Link 2</a>
    `;
    const result = parseDetailPage(html);
    assert.deepStrictEqual(result, ['ch1', 'ch-2']);
  });

  it('ignores duplicate channel IDs', () => {
    const html = `
      <a href="https://new.lastzone.top/ch1">Link 1</a>
      <a href="https://new.lastzone.top/ch1">Link 1 Again</a>
    `;
    const result = parseDetailPage(html);
    assert.deepStrictEqual(result, ['ch1']);
  });

  it('ignores the "static" path', () => {
    const html = '<a href="https://new.lastzone.top/static">Static link</a>';
    const result = parseDetailPage(html);
    assert.deepStrictEqual(result, []);
  });

  it('ignores channel IDs with a slash (invalid format)', () => {
    const html = '<a href="https://new.lastzone.top/invalid/id">Invalid ID</a>';
    const result = parseDetailPage(html);
    assert.deepStrictEqual(result, []);
  });
});
