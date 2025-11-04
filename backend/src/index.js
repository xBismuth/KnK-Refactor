import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';

import { healthRouter } from './routes/health.js';

dotenv.config();

const app = express();

// Global middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/health', healthRouter);

// Root route
app.get('/', (req, res) => {
  res.json({ ok: true, service: 'knk-backend', version: '0.1.0' });
});

// Error handler (last)
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, next) => {
  const status = err.status || 500;
  res.status(status).json({ error: err.message || 'Internal Server Error' });
});

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`API listening on http://localhost:${PORT}`);
});


