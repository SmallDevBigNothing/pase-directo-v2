const { extractCompetition } = require('./sync-tiroalpalo');

describe('extractCompetition', () => {
  it('should extract competition from a typical path', () => {
    expect(extractCompetition('/futbol/mundial-2026/slug')).toBe('Mundial 2026');
  });

  it('should extract competition without a leading slash', () => {
    expect(extractCompetition('futbol/champions-league/slug')).toBe('Champions League');
  });

  it('should handle paths with multiple dashes', () => {
    expect(extractCompetition('/sport/la-liga-espanola/x')).toBe('La Liga Espanola');
  });

  it('should return "Unknown" if there is no second segment', () => {
    expect(extractCompetition('/futbol')).toBe('Unknown');
  });

  it('should return "Unknown" for empty paths or just a slash', () => {
    expect(extractCompetition('/')).toBe('Unknown');
    expect(extractCompetition('')).toBe('Unknown');
  });

  it('should return "Unknown" when only the first segment is present with a trailing slash', () => {
    // If the path is '/futbol/', split('/') gives ['', 'futbol', '']
    // So the second segment is '', which is falsey, and returns 'Unknown'
    expect(extractCompetition('/futbol/')).toBe('Unknown');
  });

  it('should correctly capitalize each word in the competition name', () => {
    expect(extractCompetition('/futbol/premier-league/match')).toBe('Premier League');
    expect(extractCompetition('/deporte/copa-del-rey/match')).toBe('Copa Del Rey');
  });
});
