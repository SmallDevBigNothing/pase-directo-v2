const express = require('express');
const session = require('express-session');
const { createClient } = require('@supabase/supabase-js');

const app = express();
const PORT = process.env.PORT || 3000;

// --- CLIENTE SUPABASE ---
let supabase;
if (process.env.SUPABASE_URL && process.env.SUPABASE_KEY) {
    supabase = createClient(
        process.env.SUPABASE_URL,
        process.env.SUPABASE_KEY
    );
} else {
    console.warn("ADVERTENCIA: SUPABASE_URL o SUPABASE_KEY no detectados. Usando cliente mock para pruebas locales.");
    const mockQuery = {
        select: () => mockQuery,
        order: () => mockQuery,
        eq: () => mockQuery,
        in: () => mockQuery,
        single: () => mockQuery,
        insert: () => mockQuery,
        update: () => mockQuery,
        delete: () => mockQuery,
        then: (onFulfilled) => {
            return Promise.resolve({ data: [{ id: 'mock-uuid-123' }], error: null }).then(onFulfilled);
        }
    };
    supabase = {
        from: () => mockQuery
    };
}


// Configurar middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: process.env.SESSION_SECRET || 'futbol-secreto-2026',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: process.env.NODE_ENV === 'production' }
}));

// Helper para formatear fechas de partidos
function formatMatchDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    const optionsTime = { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'Europe/Madrid' };
    const optionsDate = { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'Europe/Madrid' };

    const formatterTime = new Intl.DateTimeFormat('es-ES', optionsTime);
    const formatterDate = new Intl.DateTimeFormat('es-ES', optionsDate);
    const timeStr = formatterTime.format(date);

    const now = new Date();
    const getLocalDateString = (d) => d.toLocaleDateString('sv-SE', { timeZone: 'Europe/Madrid' });

    const todayStr = getLocalDateString(now);
    const tomorrowStr = getLocalDateString(new Date(now.getTime() + 24 * 60 * 60 * 1000));
    const matchDayStr = getLocalDateString(date);

    if (matchDayStr === todayStr) {
        return `Hoy a las ${timeStr} h`;
    } else if (matchDayStr === tomorrowStr) {
        return `Mañana a las ${timeStr} h`;
    } else {
        let dateStr = formatterDate.format(date);
        dateStr = dateStr.charAt(0).toUpperCase() + dateStr.slice(1);
        return `${dateStr} a las ${timeStr} h`;
    }
}

// Middleware de autenticación
const requireAuth = (req, res, next) => {
    if (req.session && req.session.isAdmin) {
        next();
    } else {
        res.redirect('/admin/login');
    }
};

// ============================================================
// --- RUTAS PÚBLICAS ---
// ============================================================

// Vista Pública Principal (/)
app.get('/', async (req, res) => {
    const { data: matches, error } = await supabase
        .from('partidos')
        .select('*')
        .order('hora', { ascending: true });

    if (error) {
        console.error('Error al leer partidos:', error);
        return res.status(500).send('Error al cargar los partidos.');
    }

    const liveMatches = matches.filter(m => m.estado === 'En Directo');
    const upcomingMatches = matches.filter(m => m.estado === 'Próximo Partido');

    const html = `
    <!DOCTYPE html>
    <html lang="es">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Futbol en Directo</title>
        <style>
            :root {
                --bg-color: #121212;
                --surface-color: #1e1e1e;
                --primary-color: #e50914;
                --text-color: #ffffff;
                --text-secondary: #b3b3b3;
            }
            body {
                margin: 0;
                font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
                background-color: var(--bg-color);
                color: var(--text-color);
            }
            .container { max-width: 1200px; margin: 0 auto; padding: 20px; }
            header { text-align: center; padding: 40px 0; border-bottom: 1px solid #333; margin-bottom: 30px; }
            h1 { margin: 0; font-size: 2.5rem; }
            h2 { font-size: 1.8rem; margin-bottom: 20px; display: flex; align-items: center; gap: 10px; }
            .live-indicator { color: var(--primary-color); }
            .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 20px; margin-bottom: 40px; }
            .card { background: var(--surface-color); border-radius: 12px; padding: 20px; transition: transform 0.2s, box-shadow 0.2s; display: flex; flex-direction: column; justify-content: space-between; border: 1px solid #333; }
            .card:hover { transform: translateY(-5px); box-shadow: 0 8px 16px rgba(0,0,0,0.4); }
            .teams { font-size: 1.2rem; font-weight: bold; margin-bottom: 10px; }
            .time { color: var(--text-secondary); font-size: 0.9rem; margin-bottom: 20px; }
            .btn { background: var(--primary-color); color: white; text-decoration: none; padding: 10px 15px; border-radius: 6px; text-align: center; font-weight: bold; display: inline-block; transition: background 0.2s; }
            .btn:hover { background: #ff0f1a; }
            .btn-disabled { background: #333; color: #888; cursor: not-allowed; }
            .empty-state { color: var(--text-secondary); font-style: italic; }
        </style>
    </head>
    <body>
        <div class="container">
            <header>
                <h1>Futbol en Directo</h1>
            </header>

            <section>
                <h2><span class="live-indicator">🔴</span> En Directo Ahora</h2>
                <div class="grid">
                    ${liveMatches.length > 0 ? liveMatches.map(m => `
                        <div class="card">
                            <div class="teams">${m.local} vs ${m.visitante}</div>
                            <div class="time">${formatMatchDate(m.hora)}</div>
                            <a href="/partido/${m.id}" class="btn">Ver Partido</a>
                        </div>
                    `).join('') : '<p class="empty-state">No hay partidos en directo actualmente.</p>'}
                </div>
            </section>

            <section>
                <h2>📅 Próximos Partidos</h2>
                <div class="grid">
                    ${upcomingMatches.length > 0 ? upcomingMatches.map(m => `
                        <div class="card">
                            <div class="teams">${m.local} vs ${m.visitante}</div>
                            <div class="time">${formatMatchDate(m.hora)}</div>
                            <div class="btn btn-disabled">Próximamente</div>
                        </div>
                    `).join('') : '<p class="empty-state">No hay próximos partidos programados.</p>'}
                </div>
            </section>
        </div>
    </body>
    </html>
    `;
    res.send(html);
});

// Vista del Reproductor Dinámico (/partido/:id)
app.get('/partido/:id', async (req, res) => {
    const { data: match, error } = await supabase
        .from('partidos')
        .select('*')
        .eq('id', req.params.id)
        .eq('estado', 'En Directo')
        .single();

    if (error || !match) {
        return res.status(404).send('Partido no encontrado o no está en directo en este momento.');
    }

    // Construir los bloques de scripts de Ucaster disponibles
    const scriptBlocks = [];
    if (match.ucaster_id_1 && match.ucaster_script_1) {
        scriptBlocks.push(`
            <script type="text/javascript">
                width = 1920; height = 1080;
                channel = '${match.ucaster_id_1}';
                g = '1';
            </script>
            <script type="text/javascript" src="${match.ucaster_script_1}"></script>
        `);
    }
    if (match.ucaster_id_2 && match.ucaster_script_2) {
        scriptBlocks.push(`
            <script type="text/javascript">
                width = 1920; height = 1080;
                channel = '${match.ucaster_id_2}';
                g = '1';
            </script>
            <script type="text/javascript" src="${match.ucaster_script_2}"></script>
        `);
    }

    // Si hay dos canales, mostrar selector de fuente
    const hasMultiSource = scriptBlocks.length > 1;

    const html = `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <title>${match.local} vs ${match.visitante} - Futbol en Directo</title>
    <style>
        html, body { margin: 0; padding: 0; height: 100%; background: black; overflow: hidden; }
        #video-wrapper { width: 100vw; height: 100vh; display: flex; flex-direction: column; align-items: center; justify-content: center; }
        #video-container { width: 100%; height: 100%; aspect-ratio: 16 / 9; max-height: calc(100vh - ${hasMultiSource ? '50px' : '0px'}); max-width: 100vw; position: relative; }
        #video-container > * { position: absolute; width: 100%; height: 100%; top: 0; left: 0; }
        .source-bar { display: flex; gap: 10px; padding: 8px; background: #1a1a1a; width: 100%; justify-content: center; box-sizing: border-box; }
        .source-btn { background: #333; color: white; border: none; padding: 8px 18px; border-radius: 4px; cursor: pointer; font-size: 0.9rem; transition: background 0.2s; }
        .source-btn.active { background: #e50914; }
        .source-btn:hover { background: #555; }
    </style>
</head>
<body>
    <div id="video-wrapper">
        ${hasMultiSource ? `
        <div class="source-bar">
            <button class="source-btn active" onclick="switchSource(0, this)">Fuente 1</button>
            <button class="source-btn" onclick="switchSource(1, this)">Fuente 2</button>
        </div>` : ''}
        <div id="video-container">
            ${scriptBlocks[0] || ''}
        </div>
    </div>
    ${hasMultiSource ? `
    <script>
        const sources = ${JSON.stringify(scriptBlocks)};
        function switchSource(index, btn) {
            document.querySelectorAll('.source-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            const container = document.getElementById('video-container');
            container.innerHTML = sources[index];
            // Re-ejecutar scripts inyectados
            container.querySelectorAll('script').forEach(oldScript => {
                const newScript = document.createElement('script');
                if (oldScript.src) {
                    newScript.src = oldScript.src;
                } else {
                    newScript.textContent = oldScript.textContent;
                }
                oldScript.replaceWith(newScript);
            });
        }
    </script>` : ''}
</body>
</html>`;

    res.send(html);
});

// ============================================================
// --- RUTAS DE ADMINISTRACIÓN ---
// ============================================================

app.get('/admin/login', (req, res) => {
    res.send(`
        <!DOCTYPE html>
        <html>
        <head>
            <title>Login - Panel Admin</title>
            <style>
                body { font-family: sans-serif; background: #121212; color: white; display: flex; justify-content: center; align-items: center; height: 100vh; margin: 0; }
                form { background: #1e1e1e; padding: 30px; border-radius: 8px; text-align: center; width: 300px; box-shadow: 0 4px 6px rgba(0,0,0,0.5); }
                input { padding: 12px; margin: 15px 0; width: 100%; box-sizing: border-box; border: 1px solid #333; border-radius: 4px; background: #2a2a2a; color: white; }
                button { background: #e50914; color: white; border: none; padding: 12px; width: 100%; cursor: pointer; font-weight: bold; border-radius: 4px; transition: background 0.2s; }
                button:hover { background: #ff0f1a; }
            </style>
        </head>
        <body>
            <form action="/admin/login" method="POST">
                <h2>Acceso Admin</h2>
                <input type="password" name="password" placeholder="Contraseña" required>
                <button type="submit">Entrar</button>
            </form>
        </body>
        </html>
    `);
});

app.post('/admin/login', (req, res) => {
    const { password } = req.body;
    const adminPassword = process.env.ADMIN_PASSWORD || 'AdminFutbol2026';
    if (password === adminPassword) {
        req.session.isAdmin = true;
        res.redirect('/admin');
    } else {
        res.send('Contraseña incorrecta. <a href="/admin/login" style="color:#e50914;">Intentar de nuevo</a>');
    }
});

app.get('/admin/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/admin/login');
});

// Panel Principal Admin
app.get('/admin', requireAuth, async (req, res) => {
    const { data: matches, error } = await supabase
        .from('partidos')
        .select('*')
        .order('hora', { ascending: true });

    if (error) {
        console.error('Error al leer partidos:', error);
        return res.status(500).send('Error al cargar los partidos del panel.');
    }

    const html = `
        <!DOCTYPE html>
        <html>
        <head>
            <title>Panel Admin</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
                body { font-family: sans-serif; background: #f4f4f9; padding: 20px; color: #333; }
                .container { max-width: 1000px; margin: auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
                .header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 30px; }
                h1 { border-bottom: 2px solid #333; padding-bottom: 10px; margin-top: 0; }
                h2 { margin-top: 30px; color: #444; }
                .form-grid { display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-bottom: 20px; }
                .form-group { margin-bottom: 10px; }
                .form-group.full { grid-column: 1 / -1; }
                label { display: block; font-weight: bold; margin-bottom: 5px; font-size: 0.9em; }
                input, select { width: 100%; padding: 10px; box-sizing: border-box; border: 1px solid #ccc; border-radius: 4px; font-size: 1em; }
                .section-label { font-size: 0.85em; color: #888; text-transform: uppercase; letter-spacing: 0.05em; font-weight: bold; grid-column: 1 / -1; margin-top: 10px; border-top: 1px dashed #ddd; padding-top: 10px; }
                .btn-submit { background: #28a745; color: white; border: none; padding: 12px 20px; cursor: pointer; border-radius: 4px; font-weight: bold; font-size: 1em; width: 100%; margin-top: 10px; transition: background 0.2s; }
                .btn-submit:hover { background: #218838; }
                .btn-cancel { background: #6c757d; color: white; border: none; padding: 12px 20px; cursor: pointer; border-radius: 4px; font-weight: bold; font-size: 1em; width: 100%; margin-top: 10px; display: none; transition: background 0.2s; }
                .btn-cancel:hover { background: #5a6268; }
                table { width: 100%; border-collapse: collapse; margin-top: 20px; }
                th, td { padding: 10px 12px; border: 1px solid #ddd; text-align: left; font-size: 0.9em; }
                th { background: #f8f9fa; }
                .actions-cell { display: flex; gap: 5px; }
                .edit-btn { background: #007bff; color: white; border: none; padding: 7px 12px; border-radius: 4px; font-size: 0.85em; cursor: pointer; font-weight: bold; text-decoration: none; }
                .edit-btn:hover { background: #0056b3; }
                .delete-btn { background: #dc3545; color: white; text-decoration: none; padding: 7px 12px; border-radius: 4px; font-size: 0.85em; cursor: pointer; border: none; font-weight: bold; }
                .delete-btn:hover { background: #c82333; }
                .logout { color: #dc3545; text-decoration: none; font-weight: bold; }
                .logout:hover { text-decoration: underline; }
                .status-badge { padding: 4px 8px; border-radius: 4px; font-size: 0.82em; font-weight: bold; white-space: nowrap; }
                .status-live { background: #e50914; color: white; }
                .status-upcoming { background: #17a2b8; color: white; }
                code { background: #eee; padding: 2px 6px; border-radius: 4px; font-size: 0.85em; word-break: break-all; }
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h1>Gestión de Partidos</h1>
                    <a href="/admin/logout" class="logout">Cerrar Sesión</a>
                </div>

                <h2 id="form-title">Añadir Partido</h2>
                <form id="match-form" action="/admin/add" method="POST">
                    <div class="form-grid">
                        <div class="form-group">
                            <label>Equipo Local</label>
                            <input type="text" name="local" placeholder="ej: Real Madrid" required>
                        </div>
                        <div class="form-group">
                            <label>Equipo Visitante</label>
                            <input type="text" name="visitante" placeholder="ej: Barcelona" required>
                        </div>
                        <div class="form-group">
                            <label>Fecha y Hora</label>
                            <input type="datetime-local" name="hora" required>
                        </div>
                        <div class="form-group">
                            <label>Estado</label>
                            <select name="estado" required>
                                <option value="En Directo">En Directo</option>
                                <option value="Próximo Partido">Próximo Partido</option>
                            </select>
                        </div>

                        <div class="section-label">🎥 Canal Ucaster 1 (Principal)</div>
                        <div class="form-group">
                            <label>ID del Canal 1</label>
                            <input type="text" name="ucaster_id_1" placeholder="ej: jfgjj4hfdzx">
                        </div>
                        <div class="form-group">
                            <label>Script URL Canal 1</label>
                            <input type="url" name="ucaster_script_1" placeholder="ej: https://new.lastzone.top/static/scripts/hucaster.js">
                        </div>

                        <div class="section-label">🎥 Canal Ucaster 2 (Alternativo, opcional)</div>
                        <div class="form-group">
                            <label>ID del Canal 2</label>
                            <input type="text" name="ucaster_id_2" placeholder="ej: abc123xyz (opcional)">
                        </div>
                        <div class="form-group">
                            <label>Script URL Canal 2</label>
                            <input type="url" name="ucaster_script_2" placeholder="ej: https://... (opcional)">
                        </div>
                    </div>
                    <button type="submit" id="form-submit-btn" class="btn-submit">Añadir Partido</button>
                    <button type="button" id="btn-cancel" class="btn-cancel" onclick="cancelarEdicion()">Cancelar Edición</button>
                </form>

                <h2>Partidos Actuales (${matches.length})</h2>
                <table>
                    <thead>
                        <tr>
                            <th>Partido</th>
                            <th>Estado</th>
                            <th>Canal 1</th>
                            <th>Canal 2</th>
                            <th>Acciones</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${matches.length === 0 ? '<tr><td colspan="5" style="text-align:center;">No hay partidos configurados</td></tr>' : ''}
                        ${matches.map(m => `
                            <tr>
                                <td>
                                    <strong>${m.local} vs ${m.visitante}</strong><br>
                                    <small style="color:#666;">${formatMatchDate(m.hora)}</small>
                                </td>
                                <td><span class="status-badge ${m.estado === 'En Directo' ? 'status-live' : 'status-upcoming'}">${m.estado}</span></td>
                                <td>${m.ucaster_id_1 ? `<code>${m.ucaster_id_1}</code>` : '<span style="color:#aaa;">-</span>'}</td>
                                <td>${m.ucaster_id_2 ? `<code>${m.ucaster_id_2}</code>` : '<span style="color:#aaa;">-</span>'}</td>
                                <td>
                                    <div class="actions-cell">
                                        <button type="button" class="edit-btn" onclick="cargarPartido({
                                            id: '${m.id}',
                                            local: '${m.local.replace(/'/g, "\\'")}',
                                            visitante: '${m.visitante.replace(/'/g, "\\'")}',
                                            hora: '${m.hora ? m.hora : ''}',
                                            estado: '${m.estado}',
                                            ucaster_id_1: '${(m.ucaster_id_1 || '').replace(/'/g, "\\'")}',
                                            ucaster_script_1: '${(m.ucaster_script_1 || '').replace(/'/g, "\\'")}',
                                            ucaster_id_2: '${(m.ucaster_id_2 || '').replace(/'/g, "\\'")}',
                                            ucaster_script_2: '${(m.ucaster_script_2 || '').replace(/'/g, "\\'")}'
                                        })">Editar</button>
                                        <form action="/admin/eliminar/${m.id}" method="POST" style="margin:0;" onsubmit="return confirm('¿Eliminar este partido?');">
                                            <button type="submit" class="delete-btn">Eliminar</button>
                                        </form>
                                    </div>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>

            <script>
                const form = document.getElementById('match-form');
                const formTitle = document.getElementById('form-title');
                const formSubmitBtn = document.getElementById('form-submit-btn');
                const btnCancel = document.getElementById('btn-cancel');

                function cargarPartido(m) {
                    form.action = '/admin/editar/' + m.id;
                    formTitle.textContent = 'Editar Partido';
                    formSubmitBtn.textContent = 'Guardar Cambios';
                    formSubmitBtn.style.background = '#007bff';
                    btnCancel.style.display = 'block';

                    form.elements['local'].value = m.local;
                    form.elements['visitante'].value = m.visitante;
                    
                    // Ajustar fecha/hora al formato requerido por input type="datetime-local" (YYYY-MM-DDTHH:MM)
                    if (m.hora) {
                        const date = new Date(m.hora);
                        if (!isNaN(date.getTime())) {
                            const tzoffset = date.getTimezoneOffset() * 60000;
                            const localISOTime = (new Date(date.getTime() - tzoffset)).toISOString().slice(0, 16);
                            form.elements['hora'].value = localISOTime;
                        } else {
                            form.elements['hora'].value = '';
                        }
                    } else {
                        form.elements['hora'].value = '';
                    }
                    
                    form.elements['estado'].value = m.estado;
                    form.elements['ucaster_id_1'].value = m.ucaster_id_1;
                    form.elements['ucaster_script_1'].value = m.ucaster_script_1;
                    form.elements['ucaster_id_2'].value = m.ucaster_id_2;
                    form.elements['ucaster_script_2'].value = m.ucaster_script_2;
                    
                    window.scrollTo({ top: 0, behavior: 'smooth' });
                }

                function cancelarEdicion() {
                    form.action = '/admin/add';
                    formTitle.textContent = 'Añadir Partido';
                    formSubmitBtn.textContent = 'Añadir Partido';
                    formSubmitBtn.style.background = '#28a745';
                    btnCancel.style.display = 'none';
                    form.reset();
                }
            </script>
        </body>
        </html>
    `;
    res.send(html);
});

// Acción de Añadir → INSERT en Supabase
app.post('/admin/add', requireAuth, async (req, res) => {
    const { local, visitante, hora, estado, ucaster_id_1, ucaster_script_1, ucaster_id_2, ucaster_script_2 } = req.body;

    const { error } = await supabase
        .from('partidos')
        .insert([{
            local:            local || null,
            visitante:        visitante || null,
            hora:             hora || null,
            estado:           estado || 'Próximo Partido',
            ucaster_id_1:     ucaster_id_1 || null,
            ucaster_script_1: ucaster_script_1 || null,
            ucaster_id_2:     ucaster_id_2 || null,
            ucaster_script_2: ucaster_script_2 || null,
        }]);

    if (error) {
        console.error('Error al insertar partido:', error);
        return res.status(500).send('Error al guardar el partido. <a href="/admin">Volver</a>');
    }

    res.redirect('/admin');
});

// Acción de Editar → UPDATE en Supabase
app.post('/admin/editar/:id', requireAuth, async (req, res) => {
    const { local, visitante, hora, estado, ucaster_id_1, ucaster_script_1, ucaster_id_2, ucaster_script_2 } = req.body;

    const { error } = await supabase
        .from('partidos')
        .update({
            local:            local || null,
            visitante:        visitante || null,
            hora:             hora || null,
            estado:           estado || 'Próximo Partido',
            ucaster_id_1:     ucaster_id_1 || null,
            ucaster_script_1: ucaster_script_1 || null,
            ucaster_id_2:     ucaster_id_2 || null,
            ucaster_script_2: ucaster_script_2 || null,
        })
        .eq('id', req.params.id);

    if (error) {
        console.error('Error al editar partido:', error);
        return res.status(500).send('Error al editar el partido. <a href="/admin">Volver</a>');
    }

    res.redirect('/admin');
});

// Acción de Eliminar → DELETE en Supabase
app.post('/admin/eliminar/:id', requireAuth, async (req, res) => {
    const { error } = await supabase
        .from('partidos')
        .delete()
        .eq('id', req.params.id);

    if (error) {
        console.error('Error al eliminar partido:', error);
        return res.status(500).send('Error al eliminar el partido. <a href="/admin">Volver</a>');
    }

    res.redirect('/admin');
});


// API segura de sincronización para Raspado/Mistral
app.post('/api/partidos/sync', async (req, res) => {
    // 1. Validar Bearer Token
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Missing token' });
    }
    const token = authHeader.substring(7);
    const expectedToken = process.env.SCRAPER_API_TOKEN || (process.env.NODE_ENV !== 'production' ? 'test-token-123' : null);
    
    if (!expectedToken) {
        console.error('Error de configuración: SCRAPER_API_TOKEN no está definido en las variables de entorno de producción.');
        return res.status(500).json({ success: false, error: 'Server misconfiguration' });
    }
    
    if (token !== expectedToken) {
        return res.status(401).json({ success: false, error: 'Unauthorized: Invalid token' });
    }

    const { partidos } = req.body;
    if (!Array.isArray(partidos)) {
        return res.status(400).json({ success: false, error: 'Invalid payload, expected array of partidos' });
    }

    const results = [];
    for (const p of partidos) {
        const { local, visitante, hora, estado, ucaster_id_1, ucaster_script_1, ucaster_id_2, ucaster_script_2 } = p;
        
        if (!local || !visitante) {
            continue;
        }

        // Buscar si ya existe el partido con el mismo equipo local y visitante en estado 'En Directo' o 'Próximo Partido'
        const { data: existingMatches, error: searchError } = await supabase
            .from('partidos')
            .select('id')
            .eq('local', local)
            .eq('visitante', visitante)
            .in('estado', ['En Directo', 'Próximo Partido']);

        if (searchError) {
            console.error('Error buscando partido existente:', searchError);
            continue;
        }

        const matchData = {
            local,
            visitante,
            hora: hora || null,
            estado: estado || 'Próximo Partido',
            ucaster_id_1: ucaster_id_1 || null,
            ucaster_script_1: ucaster_script_1 || null,
            ucaster_id_2: ucaster_id_2 || null,
            ucaster_script_2: ucaster_script_2 || null
        };

        if (existingMatches && existingMatches.length > 0) {
            // Actualizar el partido existente
            const matchId = existingMatches[0].id;
            const { error: updateError } = await supabase
                .from('partidos')
                .update(matchData)
                .eq('id', matchId);

            if (updateError) {
                console.error(`Error actualizando partido ${local} vs ${visitante}:`, updateError);
                results.push({ local, visitante, status: 'error', error: updateError.message });
            } else {
                results.push({ local, visitante, status: 'updated', id: matchId });
            }
        } else {
            // Insertar nuevo partido
            const { data: insertedData, error: insertError } = await supabase
                .from('partidos')
                .insert([matchData])
                .select('id');

            if (insertError) {
                console.error(`Error insertando partido ${local} vs ${visitante}:`, insertError);
                results.push({ local, visitante, status: 'error', error: insertError.message });
            } else {
                results.push({ local, visitante, status: 'inserted', id: insertedData?.[0]?.id });
            }
        }
    }

    return res.status(200).json({ success: true, processed: results });
});

// Arranque del servidor (solo en local, Vercel no usa app.listen)
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => {
        console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
    });
}

module.exports = app;


