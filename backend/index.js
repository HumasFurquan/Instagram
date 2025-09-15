// backend/index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server as IOServer } from 'socket.io';
dotenv.config();

import authRoutes from './routes/auth.js';
import postsRoutes from './routes/posts.js';

const app = express();

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://frozenapple.vercel.app',
  'https://your-production-domain.com'
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS not allowed for ${origin}`));
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

app.use('/auth', authRoutes);
app.use('/posts', postsRoutes);

// create http server and socket.io
const httpServer = http.createServer(app);
const io = new IOServer(httpServer, {
  cors: {
    origin: allowedOrigins,
    credentials: true
  }
});

// optional: basic connection listener (useful for debugging)
io.on('connection', (socket) => {
  console.log('socket connected:', socket.id);
  socket.on('disconnect', () => console.log('socket disconnected:', socket.id));
});

// make io available to routes
app.set('io', io);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
