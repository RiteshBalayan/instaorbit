/**
 * InstaOrbit Simulation Server
 *
 * Express server providing orbital propagation, attitude computation,
 * link budget analysis, and Swagger API documentation.
 *
 * @module index
 */

const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swagger');

const propagationRoutes = require('./routes/propagation');

const app = express();

/* ── Middleware ────────────────────────────────────────────── */
app.use(cors());
app.use(bodyParser.json({ limit: '50mb' }));

/* ── Swagger API Documentation ────────────────────────────── */
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customCss: `
    .swagger-ui .topbar { background-color: #0f172a; }
    .swagger-ui .topbar .download-url-wrapper .select-label select { border-color: #4a7fb5; }
  `,
  customSiteTitle: 'InstaOrbit API Documentation',
  swaggerOptions: {
    persistAuthorization: true,
    displayRequestDuration: true,
    filter: true,
    tryItOutEnabled: true,
  },
}));

/**
 * @swagger
 * /api-docs.json:
 *   get:
 *     summary: Raw OpenAPI specification (JSON)
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: OpenAPI 3.0 JSON specification
 */
app.get('/api-docs.json', (_req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.send(swaggerSpec);
});

/* ── Routes ───────────────────────────────────────────────── */

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Server health check
 *     description: Returns server status and uptime. Use for monitoring and readiness probes.
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Server is healthy
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   example: ok
 *                 uptime:
 *                   type: number
 *                   description: Server uptime in seconds
 *                   example: 3600.5
 */
app.get('/health', (_req, res) => res.json({ status: 'ok', uptime: process.uptime() }));

// Propagation routes (POST /simulate, POST /simulate-bulk)
app.use('/', propagationRoutes);

// Connectivity routes (POST /link-connectivity)
const connectivityRoutes = require('./routes/connectivity');
app.use('/', connectivityRoutes);

/* ── Start Server ─────────────────────────────────────────── */
const port = process.env.PORT || 3001;
app.listen(port, () => {
  console.log(`\n  🛰  InstaOrbit simulation server listening on port ${port}`);
  console.log(`  📖  API docs available at http://localhost:${port}/api-docs\n`);
});
