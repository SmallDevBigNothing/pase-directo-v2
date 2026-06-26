const server = require('./server');

describe('teamAvatarHTML', () => {
    let teamAvatarHTML;
    let getTeamColor;
    let getTeamInitials;
    let escapeHtml;

    beforeAll(() => {
        teamAvatarHTML = server.teamAvatarHTML;
        getTeamColor = server.getTeamColor;
        getTeamInitials = server.getTeamInitials;
        escapeHtml = server.escapeHtml;
    });

    it('should return HTML with src when logoUrl is provided', () => {
        const html = teamAvatarHTML('Real Madrid', 'http://example.com/logo.png');
        expect(html).toContain('src="http://example.com/logo.png"');
        expect(html).toContain('alt="Real Madrid"');
        const initialsDiv = `<div class="team-avatar" style="background:${getTeamColor('Real Madrid')};display:none">${getTeamInitials('Real Madrid')}</div>`;
        expect(html).toContain(initialsDiv);
        expect(html).not.toContain('data-auto-logo');
    });

    it('should return HTML with data-auto-logo when logoUrl is not provided', () => {
        const html = teamAvatarHTML('FC Barcelona', null);
        expect(html).not.toContain('src=');
        expect(html).toContain('data-auto-logo="FC Barcelona"');
        expect(html).toContain('alt="FC Barcelona"');
        const imgTag = `<img class="team-logo" data-auto-logo="FC Barcelona" alt="FC Barcelona" style="display:none" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'">`;
        expect(html).toContain(imgTag);
    });

    it('should use default name "Team" for color and initials if name is empty', () => {
        const html = teamAvatarHTML('', null);
        expect(html).toContain('data-auto-logo=""');
        expect(html).toContain('alt=""');

        const defaultColor = getTeamColor('Team');
        const defaultInitials = getTeamInitials('Team');
        expect(html).toContain(`style="background:${defaultColor}"`);
        expect(html).toContain(`>${defaultInitials}</div>`);
    });

    it('should correctly escape HTML characters in data-auto-logo', () => {
        const name = 'A & B < C > D " E \' F';
        const html = teamAvatarHTML(name, null);
        const escapedName = escapeHtml(name);
        expect(html).toContain(`data-auto-logo="${escapedName}"`);
        expect(html).toContain(`alt="${name}"`); // Note: the original code does not escape name in the alt attribute!
    });
});
