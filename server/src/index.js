import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import layoutRoutes from './routes/layouts.js';
import pdfRoutes from './routes/pdf.js';
import { initDatabase } from './config/init.js';
import { closeBrowser } from './services/pdfService.js';

dotenv.config();

const app = express();
const PORT = parseInt(process.env.PORT || '3050');

// ─── Middleware ───
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// ─── Routes ───
app.use('/api/auth', authRoutes);
app.use('/api/layouts', layoutRoutes);
app.use('/api/pdf', pdfRoutes);

// Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Error handling ───
app.use((err, _req, res, _next) => {
  console.error('Unhandled error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

// ─── Start server ───
async function start() {
  try {
    await initDatabase();
    app.listen(PORT, () => {
      console.log(`\n🚀 Hanzi Layout Server running at http://localhost:${PORT}`);
      console.log(`   API endpoints:`);
      console.log(`   POST /api/auth/login`);
      console.log(`   GET  /api/auth/me`);
      console.log(`   GET  /api/layouts`);
      console.log(`   POST /api/layouts`);
      console.log(`   PUT  /api/layouts/:id`);
      console.log(`   DELETE /api/layouts/:id`);
      console.log(`   POST /api/pdf/generate`);
      console.log(`   GET  /api/health\n`);
    });
  } catch (err) {
    console.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down...');
  await closeBrowser();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  await closeBrowser();
  process.exit(0);
});

start();
