const { parseListingPage } = require('./sync-tiroalpalo');

describe('parseListingPage', () => {
  it('should extract valid matching links and normalize them', () => {
    const html = `
      <ul>
        <li><a href="/futbol/partido-1">(12:00) Real Madrid vs Barcelona</a></li>
        <li><a href="https://example.com/baloncesto/partido-2">(15:30) Lakers vs Bulls</a></li>
        <li><a href="/futbol/partido-3">No time here</a></li>
        <li><a href="/directo">(18:00) Directo link should be ignored</a></li>
        <li><a href="static/page">(19:00) Static page ignored</a></li>
      </ul>
    `;
    const result = parseListingPage(html);
    expect(result).toHaveLength(2);
    expect(result[0]).toEqual({ href: '/futbol/partido-1', title: '(12:00) Real Madrid vs Barcelona' });
    expect(result[1]).toEqual({ href: '/baloncesto/partido-2', title: '(15:30) Lakers vs Bulls' });
  });

  it('should ignore invalid absolute URLs that throw during parsing', () => {
    // This HTML has a link that starts with http:// but is invalid
    // so new URL() throws and it gets ignored (the catch block executes and continues).
    const html = `
      <ul>
        <li><a href="http://%">(20:00) Invalid URL match</a></li>
        <li><a href="/futbol/partido-valid">(21:00) Valid match</a></li>
      </ul>
    `;
    const result = parseListingPage(html);

    // Only the valid match should be returned
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ href: '/futbol/partido-valid', title: '(21:00) Valid match' });
  });

  it('should deduplicate links', () => {
    const html = `
      <ul>
        <li><a href="/futbol/partido-1">(12:00) Real Madrid vs Barcelona</a></li>
        <li><a href="/futbol/partido-1">(12:00) Real Madrid vs Barcelona (duplicate)</a></li>
      </ul>
    `;
    const result = parseListingPage(html);
    expect(result).toHaveLength(1);
    expect(result[0]).toEqual({ href: '/futbol/partido-1', title: '(12:00) Real Madrid vs Barcelona' });
  });
});
