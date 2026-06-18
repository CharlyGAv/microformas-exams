import 'dotenv/config';
import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import path from 'path';
import passport from './config/passport';
import {
  generalLimiter,
  authLimiter,
  inputSanitizer,
  extraSecurityHeaders,
} from './middleware/security';

import authRoutes from './routes/auth';
import examRoutes from './routes/exams';
import questionRoutes from './routes/questions';
import attemptRoutes from './routes/attempts';
import userRoutes from './routes/users';
import dashboardRoutes from './routes/dashboard';
import reportRoutes from './routes/reports';
import { setupSockets } from './sockets/examSocket';

const app = express();
app.set('trust proxy', 1); // Render/proxies: usar IP real del cliente
const httpServer = createServer(app);

const FRONTEND_ORIGIN = process.env.FRONTEND_URL || 'http://localhost:5173';

const io = new Server(httpServer, {
  cors: {
    origin: FRONTEND_ORIGIN,
    credentials: true,
  },
});

setupSockets(io);

// ── Seguridad base ────────────────────────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", 'data:', 'https://lh3.googleusercontent.com'],
      connectSrc: ["'self'", FRONTEND_ORIGIN, 'https://accounts.google.com'],
      fontSrc: ["'self'", 'data:'],
      objectSrc: ["'none'"],
      frameSrc: ["'none'"],
      baseUri: ["'self'"],
      formAction: ["'self'"],
    },
  },
  hsts: { maxAge: 31536000, includeSubDomains: true, preload: true },
  referrerPolicy: { policy: 'strict-origin-when-cross-origin' },
}));

app.use(cors({
  origin: FRONTEND_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

app.use(extraSecurityHeaders);
app.use(generalLimiter);
app.use(morgan('dev'));

// Body límite reducido para evitar ataques de payload masivo
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true, limit: '2mb' }));
app.use(inputSanitizer);
app.use(passport.initialize());

// ── Rutas ─────────────────────────────────────────────────────────────────────
app.use('/api/auth', authLimiter, authRoutes);
app.use('/api/exams', examRoutes);
app.use('/api/exams/:examId/questions', questionRoutes);
app.use('/api', attemptRoutes);
app.use('/api/users', userRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reports', reportRoutes);

app.get('/health', (_req, res) => res.json({ status: 'ok', timestamp: new Date() }));

// Servir frontend compilado en producción
if (process.env.NODE_ENV === 'production') {
  const frontendDist = path.join(__dirname, '../../frontend/dist');
  app.use(express.static(frontendDist));
  app.get('*', (_req, res) => {
    res.sendFile(path.join(frontendDist, 'index.html'));
  });
} else {
  app.use((_req, res) => res.status(404).json({ error: 'Ruta no encontrada' }));
}

const PORT = process.env.PORT || 4000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Microformas Exams API running on port ${PORT}`);
  console.log(`📊 Dashboard: http://localhost:${PORT}/health`);
});

export { io };
