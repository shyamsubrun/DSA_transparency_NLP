// Load environment variables FIRST, before any other imports
// This ensures Prisma can read DATABASE_URL when initializing
import dotenv from 'dotenv';
dotenv.config();

import express from 'express';
import cors from 'cors';
import moderationRoutes from './routes/moderation.routes.js';
import filtersRoutes from './routes/filters.routes.js';
import verificationRoutes from './routes/verification.routes.js';
import analyticsRoutes from './routes/analytics.routes.js';

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors({ 
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.status(200).json({ 
    status: 'ok', 
    timestamp: new Date().toISOString(),
    service: 'dsa-dashboard-backend'
  });
});

// API Routes
app.use('/api/moderation', moderationRoutes);
app.use('/api/filters', filtersRoutes);
app.use('/api/verification', verificationRoutes);
app.use('/api/analytics', analyticsRoutes);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Route not found' });
});

// Error handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error('Error:', err);
  res.status(500).json({ 
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(PORT, () => {
  console.log(`✅ Backend server running on http://localhost:${PORT}`);
  console.log(`📊 Health check: http://localhost:${PORT}/health`);
  console.log(`🔌 API endpoints: http://localhost:${PORT}/api`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV || 'development'}`);
});

export default app;

