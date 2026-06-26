const { formatMatchDate } = require('./server.js');

describe('formatMatchDate', () => {
    beforeAll(() => {
        // Use fake timers to mock the current system time.
        // We need to set it to a specific point so "Today" and "Tomorrow" are deterministic.
        // Let's set it to 2023-10-15T12:00:00Z.
        jest.useFakeTimers();
        jest.setSystemTime(new Date('2023-10-15T12:00:00Z'));
    });

    afterAll(() => {
        jest.useRealTimers();
    });

    it('returns empty string if dateString is empty or null', () => {
        expect(formatMatchDate('')).toBe('');
        expect(formatMatchDate(null)).toBe('');
        expect(formatMatchDate(undefined)).toBe('');
    });

    it('returns original string if dateString is invalid', () => {
        expect(formatMatchDate('invalid-date')).toBe('invalid-date');
    });

    it('formats as "Today at HH:MM" when date matches today in Europe/Madrid', () => {
        // 2023-10-15 is "Today"
        const dateString = '2023-10-15T18:30:00Z';
        // 18:30:00Z in Madrid (UTC+2 in October before DST end) is 20:30
        expect(formatMatchDate(dateString)).toBe('Today at 20:30');
    });

    it('formats as "Tomorrow at HH:MM" when date matches tomorrow in Europe/Madrid', () => {
        // 2023-10-16 is "Tomorrow"
        const dateString = '2023-10-16T18:30:00Z';
        expect(formatMatchDate(dateString)).toBe('Tomorrow at 20:30');
    });

    it('formats with full date when date is beyond tomorrow', () => {
        // 2023-10-18 is beyond tomorrow
        const dateString = '2023-10-18T18:30:00Z';
        // 2023-10-18 is a Wednesday
        // Output format: "Wednesday, October 18 at 20:30"
        expect(formatMatchDate(dateString)).toBe('Wednesday, October 18 at 20:30');
    });

    it('handles transition over midnight properly in Europe/Madrid', () => {
        // If current UTC time is 23:00, in Madrid it's already tomorrow (01:00)
        // Let's set system time to '2023-10-15T23:00:00Z'
        jest.setSystemTime(new Date('2023-10-15T23:00:00Z'));
        // In Madrid, today is 2023-10-16.

        // Match at '2023-10-16T18:00:00Z' (20:00 Madrid time)
        // This is on 2023-10-16, which is "Today" in Madrid.
        expect(formatMatchDate('2023-10-16T18:00:00Z')).toBe('Today at 20:00');

        // Reset system time for other tests if necessary
        jest.setSystemTime(new Date('2023-10-15T12:00:00Z'));
    });
});
