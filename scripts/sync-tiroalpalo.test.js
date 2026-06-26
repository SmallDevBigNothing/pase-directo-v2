const { buildIsoDatetime } = require('./sync-tiroalpalo');

describe('buildIsoDatetime', () => {

  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('returns null if timeStr is falsy', () => {
    expect(buildIsoDatetime(null)).toBeNull();
    expect(buildIsoDatetime('')).toBeNull();
  });

  it('handles standard afternoon time correctly', () => {
    // 2026-06-21T15:00:00.000Z UTC is 2026-06-21T17:00:00 in Madrid
    jest.setSystemTime(new Date('2026-06-21T15:00:00.000Z'));

    // We pass "18:00" which we expect to be 18:00 in Madrid on 2026-06-21
    // In Madrid timezone in summer (UTC+2), 18:00 is 16:00 UTC
    const result = buildIsoDatetime('18:00');
    expect(result).toBe('2026-06-21T16:00:00.000Z');
  });

  it('shifts time to tomorrow if time is early (0:00-5:00) and current time is afternoon (>=12:00)', () => {
    // Current time: 2026-06-21T15:00:00.000Z (17:00 in Madrid)
    jest.setSystemTime(new Date('2026-06-21T15:00:00.000Z'));

    // We pass "02:00" -> very early. Since it's afternoon in Madrid, this should be interpreted as tomorrow.
    // 2026-06-22 02:00 in Madrid (summer UTC+2) is 2026-06-22 00:00 UTC
    const result = buildIsoDatetime('02:00');
    expect(result).toBe('2026-06-22T00:00:00.000Z');
  });

  it('does not shift time if current time is morning (<12:00)', () => {
    // Current time: 2026-06-21T08:00:00.000Z (10:00 in Madrid)
    jest.setSystemTime(new Date('2026-06-21T08:00:00.000Z'));

    // We pass "02:00" -> very early. Since it's morning, it should be interpreted as today.
    // 2026-06-21 02:00 in Madrid (summer UTC+2) is 2026-06-21 00:00 UTC
    const result = buildIsoDatetime('02:00');
    expect(result).toBe('2026-06-21T00:00:00.000Z');
  });

});
