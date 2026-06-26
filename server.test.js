const app = require('./server');

describe('getTeamInitials', () => {
    const getTeamInitials = app.getTeamInitials;

    it('should return empty string for empty input', () => {
        expect(getTeamInitials('')).toBe('');
    });

    it('should return the first letter for a single word name', () => {
        expect(getTeamInitials('Arsenal')).toBe('A');
    });

    it('should return the initials for a two word name', () => {
        expect(getTeamInitials('Manchester United')).toBe('MU');
    });

    it('should return the first three initials for a name with more than three words', () => {
        expect(getTeamInitials('Real Madrid Club de Futbol')).toBe('RMC');
    });

    it('should handle extra spaces correctly', () => {
        expect(getTeamInitials('  Manchester   United  ')).toBe('MU');
    });
});
