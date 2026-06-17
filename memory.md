# Memory - Pase Directo V2.1 (Migración Vercel + Supabase)

## Proyecto
Despliegue previsto: **Vercel** (Serverless)
Base de datos: **Supabase** (PostgreSQL)

## Arquitectura y Decisiones Técnicas
- **Node.js + Express (Vercel Serverless Functions)**: Servidor Express tradicional configurado para ejecutarse en Vercel a través de Serverless Functions (definido en `vercel.json` enrutando todas las peticiones a `server.js`).
- **Base de datos persistente en Supabase**: Los partidos ya no se guardan en un array en memoria. Toda la lógica se ha migrado para leer, insertar y borrar datos usando la librería oficial `@supabase/supabase-js`.
- **Doble Fuente de Stream (Ucaster)**: La base de datos y la interfaz soportan ahora hasta 2 canales/fuentes diferentes de Ucaster (`ucaster_id_1`, `ucaster_script_1`, `ucaster_id_2`, `ucaster_script_2`).
- **Selector de Fuente Dinámico**: En la vista de reproductor `/partido/:id`, si el partido cuenta con dos fuentes de stream configuradas, se muestra un selector dinámico para intercambiar la señal del stream sin salir de la página del reproductor.
- **Autenticación (express-session)**: Protege el endpoint `/admin` y sus subrutas. Las sesiones se guardan en memoria de manera efímera (pueden expirar aleatoriamente debido a la naturaleza serverless de Vercel).
- **Seguridad**: Contraseña de administrador leída de la variable de entorno `ADMIN_PASSWORD` (por defecto `AdminFutbol2026`).

## Estructura de la Base de Datos (Supabase)
La tabla de la base de datos se llama `partidos` y cuenta con las siguientes columnas:
- `id` (uuid, clave primaria autogenerada)
- `local` (text, nombre del equipo local)
- `visitante` (text, nombre del equipo visitante)
- `hora` (timestamptz, fecha y hora del evento)
- `estado` (text, con valores 'En Directo' o 'Próximo Partido')
- `ucaster_id_1` (text, código del canal 1)
- `ucaster_script_1` (text, url del script 1)
- `ucaster_id_2` (text, código del canal 2)
- `ucaster_script_2` (text, url del script 2)
- `created_at` (timestamptz)

## Variables de Entorno Requeridas (Vercel Settings)
- `SUPABASE_URL`: URL de conexión de Supabase.
- `SUPABASE_KEY`: Clave `service_role` de Supabase para tener permisos de escritura.
- `ADMIN_PASSWORD`: Contraseña para acceder al panel de administración.
- `SESSION_SECRET`: Secreto para encriptar las cookies de sesión de Express.
- `NODE_ENV`: Establecido en `production`.

## TODO / Siguientes pasos recomendados
- [ ] **Almacenamiento de sesiones en base de datos**: Dado que en Vercel la memoria no persiste entre ejecuciones de funciones serverless, es muy recomendable conectar un session store como Redis (ej: Upstash Redis, que ofrece capa gratuita) o utilizar el propio Supabase para almacenar las sesiones de express y evitar cierres de sesión repentinos en `/admin`.
