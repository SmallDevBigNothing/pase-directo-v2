const { test } = require('node:test');
const assert = require('node:assert');
const { parseTitle } = require('../scripts/sync-tiroalpalo');

test('parseTitle - Team sport with time', () => {
  const result = parseTitle('Bélgica - Irán (21:00)');
  assert.deepStrictEqual(result, { local: 'Bélgica', visitante: 'Irán', time: '21:00' });
});

test('parseTitle - Non-team sport with time and pipe separator', () => {
  const result = parseTitle('IndyCar | GP de Road America (20:30)');
  assert.deepStrictEqual(result, { local: 'GP de Road America', visitante: '', time: '20:30' });
});

test('parseTitle - Non-team sport with no pipe separator', () => {
  const result = parseTitle('Tour de France Stage 1 (14:00)');
  assert.deepStrictEqual(result, { local: 'Tour de France Stage 1', visitante: '', time: '14:00' });
});

test('parseTitle - No time specified', () => {
  const result = parseTitle('Real Madrid - Barcelona');
  assert.deepStrictEqual(result, { local: 'Real Madrid', visitante: 'Barcelona', time: null });
});

test('parseTitle - Title with extra spaces', () => {
  const result = parseTitle('  Team A   -   Team B   (12:30)  ');
  assert.deepStrictEqual(result, { local: 'Team A', visitante: 'Team B', time: '12:30' });
});

test('parseTitle - Non-team with pipe but empty event name', () => {
  const result = parseTitle('SomeSport | (10:00)');
  assert.deepStrictEqual(result, { local: 'SomeSport |', visitante: '', time: '10:00' });
});
