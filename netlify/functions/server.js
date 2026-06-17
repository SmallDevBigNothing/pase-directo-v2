const serverless = require('serverless-http');
const app = require('../../server'); // Importa la app Express de la raíz

module.exports.handler = serverless(app);
