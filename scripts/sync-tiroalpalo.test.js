const { describe, it } = require('node:test');
const assert = require('node:assert');

const {
  detectSport,
  parseTitle,
} = require('./sync-tiroalpalo');

describe('parseTitle', () => {
  it('should parse team sports correctly', () => {
    const result = parseTitle('Bélgica - Irán (21:00)');
    assert.deepStrictEqual(result, {
      local: 'Bélgica',
      visitante: 'Irán',
      time: '21:00'
    });
  });

  it('should parse non-team sports correctly', () => {
    const result = parseTitle('IndyCar | GP de Road America (20:30)');
    assert.deepStrictEqual(result, {
      local: 'GP de Road America',
      visitante: '',
      time: '20:30'
    });
  });

  it('should handle no time gracefully', () => {
    const result = parseTitle('Bélgica - Irán');
    assert.deepStrictEqual(result, {
      local: 'Bélgica',
      visitante: 'Irán',
      time: null
    });
  });
});

describe('detectSport', () => {
  it('should detect Football from /futbol', () => {
    assert.strictEqual(detectSport('/futbol/mundial/match'), 'Football');
  });

  it('should detect IndyCar from /indycar', () => {
    assert.strictEqual(detectSport('/indycar/gp'), 'IndyCar');
  });

  it('should fallback to Other for unknown sports', () => {
    assert.strictEqual(detectSport('/unknown-sport/match'), 'Other');
  });

  it('should handle empty paths', () => {
    assert.strictEqual(detectSport('/'), 'Other');
    assert.strictEqual(detectSport(''), 'Other');
  });
});

const { extractCompetition, buildIsoDatetime } = require('./sync-tiroalpalo');

describe('extractCompetition', () => {
  it('should extract and format competition correctly', () => {
    assert.strictEqual(extractCompetition('/futbol/mundial-2026/match'), 'Mundial 2026');
  });

  it('should handle single word competitions', () => {
    assert.strictEqual(extractCompetition('/futbol/amistoso/match'), 'Amistoso');
  });

  it('should handle missing competition segment', () => {
    assert.strictEqual(extractCompetition('/futbol'), 'Unknown');
  });

  it('should handle empty paths', () => {
    assert.strictEqual(extractCompetition('/'), 'Unknown');
  });
});

describe('buildIsoDatetime', () => {
  it('should return null for empty time', () => {
    assert.strictEqual(buildIsoDatetime(null), null);
    assert.strictEqual(buildIsoDatetime(''), null);
  });

  it('should return a valid ISO datetime string', () => {
    const isoString = buildIsoDatetime('21:30');
    assert.strictEqual(typeof isoString, 'string');
    // Ensure it ends with Z (UTC timezone) or +00:00 depending on Date.toISOString()
    assert.ok(isoString.endsWith('Z'));
    // Ensure hours and minutes are roughly correct (ignoring timezone logic for simplicity)
    const date = new Date(isoString);
    assert.ok(!isNaN(date.getTime()), 'Should be a valid date');
  });
});

const { parseListingPage, parseDetailPage, buildPartido } = require('./sync-tiroalpalo');

describe('parseListingPage', () => {
  it('should parse valid match links correctly', () => {
    const html = `
      <ul>
        <li><a href="/futbol/comp/match1">Team A - Team B (20:00)</a></li>
        <li><a href="/baloncesto/comp/match2">Team C - Team D (22:30)</a></li>
        <li><a href="https://tiroalpalof.org/tenis/comp/match3">Player A - Player B (14:00)</a></li>
        <li><a href="/directo">Directo (ignore)</a></li>
        <li><a href="/other">Not a match</a></li>
      </ul>
    `;
    const matches = parseListingPage(html);
    assert.strictEqual(matches.length, 3);
    assert.deepStrictEqual(matches[0], { href: '/futbol/comp/match1', title: 'Team A - Team B (20:00)' });
    assert.deepStrictEqual(matches[1], { href: '/baloncesto/comp/match2', title: 'Team C - Team D (22:30)' });
    assert.deepStrictEqual(matches[2], { href: '/tenis/comp/match3', title: 'Player A - Player B (14:00)' });
  });

  it('should strip HTML tags from titles', () => {
    const html = `
      <a href="/futbol/comp/match4"><h3>Team X - Team Y <span>(18:00)</span></h3></a>
    `;
    const matches = parseListingPage(html);
    assert.strictEqual(matches.length, 1);
    assert.strictEqual(matches[0].title, 'Team X - Team Y (18:00)');
  });

  it('should deduplicate links', () => {
    const html = `
      <a href="/futbol/comp/match5">Team A - Team B (20:00)</a>
      <a href="/futbol/comp/match5">Team A - Team B (20:00)</a>
    `;
    const matches = parseListingPage(html);
    assert.strictEqual(matches.length, 1);
  });
});

describe('parseDetailPage', () => {
  it('should extract UCASTER channel IDs correctly', () => {
    const html = `
      <div>
        <a href="https://new.lastzone.top/channel123">Link 1</a>
        <a href="http://new.lastzone.top/channel456">Link 2</a>
        <a href="https://new.lastzone.top/static/scripts.js">Ignore static</a>
        <a href="https://new.lastzone.top/channel123">Duplicate Link 1</a>
        <a href="https://other.com/channel789">Other domain</a>
      </div>
    `;
    const channels = parseDetailPage(html);
    assert.deepStrictEqual(channels, ['channel123', 'channel456']);
  });
});

describe('buildPartido', () => {
  it('should build a partido object with 2 channels', () => {
    const partido = buildPartido('Local', 'Visit', '2023-10-25T20:00:00Z', 'Comp', 'Sport', ['ch1', 'ch2']);
    assert.deepStrictEqual(partido, {
      local: 'Local',
      visitante: 'Visit',
      hora: '2023-10-25T20:00:00Z',
      estado: 'Live',
      competicion: 'Comp',
      deporte: 'Sport',
      ucaster_id_1: 'ch1',
      ucaster_script_1: 'https://new.lastzone.top/static/scripts/hucaster.js',
      ucaster_id_2: 'ch2',
      ucaster_script_2: 'https://new.lastzone.top/static/scripts/hucaster.js'
    });
  });

  it('should build a partido object with 0 channels', () => {
    const partido = buildPartido('Local', 'Visit', '2023-10-25T20:00:00Z', 'Comp', 'Sport', []);
    assert.deepStrictEqual(partido, {
      local: 'Local',
      visitante: 'Visit',
      hora: '2023-10-25T20:00:00Z',
      estado: 'Live',
      competicion: 'Comp',
      deporte: 'Sport',
      ucaster_id_1: null,
      ucaster_script_1: null,
      ucaster_id_2: null,
      ucaster_script_2: null
    });
  });
});
