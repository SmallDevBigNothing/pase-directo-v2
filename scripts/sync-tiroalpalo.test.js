const assert = require('node:assert');
const test = require('node:test');
const { detectSport } = require('./sync-tiroalpalo');

test('detectSport() maps known sport prefixes to standard names', () => {
  assert.strictEqual(detectSport('/futbol/mundial-2026/slug'), 'Football');
  assert.strictEqual(detectSport('/indycar/some-event'), 'IndyCar');
  assert.strictEqual(detectSport('/baloncesto/nba/finals'), 'Basketball');
  assert.strictEqual(detectSport('/tenis/wimbledon'), 'Tennis');
  assert.strictEqual(detectSport('/formula-1/monaco'), 'Formula 1');
  assert.strictEqual(detectSport('/motogp/valencia'), 'MotoGP');
});

test('detectSport() returns "Other" for unknown prefixes', () => {
  assert.strictEqual(detectSport('/cricket/world-cup'), 'Other');
  assert.strictEqual(detectSport('/unknown-sport/test'), 'Other');
  assert.strictEqual(detectSport('/random/path'), 'Other');
});

test('detectSport() handles empty paths', () => {
  assert.strictEqual(detectSport(''), 'Other');
  assert.strictEqual(detectSport('/'), 'Other');
});

test('detectSport() handles paths without leading slashes', () => {
  assert.strictEqual(detectSport('futbol/mundial-2026/slug'), 'Football');
  assert.strictEqual(detectSport('tenis/wimbledon'), 'Tennis');
  assert.strictEqual(detectSport('unknown-sport'), 'Other');
});
