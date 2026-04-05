require('dotenv').config();

const app = require('./src/app');

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, () => {
  console.log(`
  ╔════════════════════════════════════════════════════╗
  ║    Finance Dashboard API Server                    ║
  ║────────────────────────────────────────────────────║
  ║    Environment : ${(process.env.NODE_ENV || 'development').padEnd(30)}║
  ║    Port        : ${String(PORT).padEnd(30)}║
  ║    API Docs    : http://localhost:${PORT}/api-docs${' '.repeat(Math.max(0, 14 - String(PORT).length))}║
  ╚════════════════════════════════════════════════════╝
  `);
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received. Shutting down gracefully...');
  const { closeDatabase } = require('./src/config/database');
  closeDatabase();
  server.close(() => {
    process.exit(0);
  });
});

process.on('SIGINT', () => {
  console.log('SIGINT received. Shutting down gracefully...');
  const { closeDatabase } = require('./src/config/database');
  closeDatabase();
  server.close(() => {
    process.exit(0);
  });
});

module.exports = server;
