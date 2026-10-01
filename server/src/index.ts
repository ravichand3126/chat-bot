import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'node:path';
import conversationRoutes from './routes/conversations.js';
import chatRoutes from './routes/chat.js';
import { isGeminiConfigured } from './services/gemini.js';

// Load .env from server directory first, then root directory fallback
dotenv.config({ path: path.join(process.cwd(), '.env') });
dotenv.config({ path: path.join(process.cwd(), '..', '.env') });

const app = express();
const PORT = process.env.PORT ? parseInt(process.env.PORT, 10) : 3001;

// Allowed Origins for Production (Render, Vercel, Local Development, & Android APK Capacitor WebView)
const allowedOrigins = [
  process.env.CLIENT_URL,
  'http://localhost:5173',
  'http://127.0.0.1:5173',
  'http://localhost:3000',
  'http://localhost',
  'https://localhost',
  'capacitor://localhost',
].filter(Boolean) as string[];

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile APK native webviews, curl, server-to-server)
      if (!origin) return callback(null, true);

      // Allow exact matches or Vercel preview/production deployments (*.vercel.app)
      if (
        allowedOrigins.includes(origin) ||
        allowedOrigins.includes('*') ||
        origin.endsWith('.vercel.app')
      ) {
        return callback(null, true);
      }

      // In production, reject unauthorized web origins
      if (process.env.NODE_ENV === 'production') {
        console.warn(`[CORS] Blocked request from origin: ${origin}`);
        return callback(new Error('CORS request rejected: Origin not allowed.'));
      }

      return callback(null, true);
    },
    credentials: true,
  })
);

// Middleware
app.use(express.json({ limit: '10mb' }));

// API Routes
app.use('/api/conversations', conversationRoutes);
app.use('/api/chat', chatRoutes);

// Health check endpoints for Render & Load Balancers
app.get(['/health', '/api/health'], (_req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    geminiKeyConfigured: isGeminiConfigured(),
  });
});

// Fallback error handler
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled server error:', err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`[Server] Monochrome AI Chatbot API running on port ${PORT} (bound to 0.0.0.0)`);
  console.log(`[Server] Gemini API Key status: ${isGeminiConfigured() ? 'CONFIGURED' : 'NOT CONFIGURED'}`);
});
