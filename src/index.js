require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT;

app.listen(PORT, () => {
  console.log(`[Local Development] Server running on http://localhost:${PORT}`);
  console.log(`[Local Development] Health check available at http://localhost:${PORT}/api/v1/health`);
});