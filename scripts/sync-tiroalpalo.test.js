const { buildPartido, UCASTER_SCRIPT } = require('./sync-tiroalpalo');

describe('buildPartido', () => {
  it('should build a partido with 0 channels', () => {
    const local = 'Team A';
    const visitante = 'Team B';
    const hora = '2023-10-27T18:00:00.000Z';
    const competicion = 'La Liga';
    const deporte = 'Football';
    const channels = [];

    const result = buildPartido(local, visitante, hora, competicion, deporte, channels);

    expect(result).toEqual({
      local: 'Team A',
      visitante: 'Team B',
      hora: '2023-10-27T18:00:00.000Z',
      estado: 'Live',
      competicion: 'La Liga',
      deporte: 'Football',
      ucaster_id_1: null,
      ucaster_script_1: null,
      ucaster_id_2: null,
      ucaster_script_2: null,
    });
  });

  it('should build a partido with 1 channel', () => {
    const local = 'Team A';
    const visitante = 'Team B';
    const hora = '2023-10-27T18:00:00.000Z';
    const competicion = 'La Liga';
    const deporte = 'Football';
    const channels = ['channel1'];

    const result = buildPartido(local, visitante, hora, competicion, deporte, channels);

    expect(result).toEqual({
      local: 'Team A',
      visitante: 'Team B',
      hora: '2023-10-27T18:00:00.000Z',
      estado: 'Live',
      competicion: 'La Liga',
      deporte: 'Football',
      ucaster_id_1: 'channel1',
      ucaster_script_1: UCASTER_SCRIPT,
      ucaster_id_2: null,
      ucaster_script_2: null,
    });
  });

  it('should build a partido with 2 channels', () => {
    const local = 'Team A';
    const visitante = 'Team B';
    const hora = '2023-10-27T18:00:00.000Z';
    const competicion = 'La Liga';
    const deporte = 'Football';
    const channels = ['channel1', 'channel2'];

    const result = buildPartido(local, visitante, hora, competicion, deporte, channels);

    expect(result).toEqual({
      local: 'Team A',
      visitante: 'Team B',
      hora: '2023-10-27T18:00:00.000Z',
      estado: 'Live',
      competicion: 'La Liga',
      deporte: 'Football',
      ucaster_id_1: 'channel1',
      ucaster_script_1: UCASTER_SCRIPT,
      ucaster_id_2: 'channel2',
      ucaster_script_2: UCASTER_SCRIPT,
    });
  });

  it('should build a partido when local and visitante are missing (falsy)', () => {
    const local = null;
    const visitante = undefined;
    const hora = '2023-10-27T18:00:00.000Z';
    const competicion = 'La Liga';
    const deporte = 'Football';
    const channels = ['channel1'];

    const result = buildPartido(local, visitante, hora, competicion, deporte, channels);

    expect(result).toEqual({
      local: '',
      visitante: '',
      hora: '2023-10-27T18:00:00.000Z',
      estado: 'Live',
      competicion: 'La Liga',
      deporte: 'Football',
      ucaster_id_1: 'channel1',
      ucaster_script_1: UCASTER_SCRIPT,
      ucaster_id_2: null,
      ucaster_script_2: null,
    });
  });
});
