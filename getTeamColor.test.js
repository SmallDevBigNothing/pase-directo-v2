const { getTeamColor } = require('./server');

describe('getTeamColor', () => {
    it('returns a color for a given team name', () => {
        expect(getTeamColor('Real Madrid')).toBe('hsl(175, 55%, 40%)');
    });

    it('returns consistent colors for the same input', () => {
        const color1 = getTeamColor('FC Barcelona');
        const color2 = getTeamColor('FC Barcelona');
        expect(color1).toBe(color2);
    });

    it('returns different colors for different teams', () => {
        const color1 = getTeamColor('FC Barcelona');
        const color2 = getTeamColor('Real Madrid');
        expect(color1).not.toBe(color2);
    });

    it('handles empty strings', () => {
        expect(getTeamColor('')).toBe('hsl(0, 55%, 40%)');
    });
});
