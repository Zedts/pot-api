require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 10000;

app.listen(PORT, '0.0.0.0', () => {
  const baseUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`;
  console.log(`[Server] Bound to 0.0.0.0:${PORT} — reachable at ${baseUrl}`);
  console.log(`[Server] Health check: ${baseUrl}/api/v1/health`);
});