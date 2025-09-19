// backend/index.js
import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';

import { Server } from 'socket.io';
dotenv.config();

import authRoutes from './routes/auth.js';
import postsRoutes from './routes/posts.js';
import eventsRoutes from './routes/events.js';

const app = express();
const httpServer = http.createServer(app);

const allowedOrigins = [
  'http://localhost:5173',          // your vite dev
  'http://localhost:3000',          // other local dev ports if used
  'https://frozenapple.vercel.app', // your deployed frontend (example)
  'https://frozenapple.netlify.app' // another if used
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin) return callback(null, true); // allow non-browser requests
    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error(`CORS not allowed for ${origin}`), false);
    }
    return callback(null, true);
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// create socket.io with CORS
const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST", "DELETE"],
    credentials: true
  }
});

// attach io to app so routes can emit: req.app.get('io')
app.set('io', io);

io.on('connection', socket => {
  console.log('socket connected', socket.id);
  socket.on('disconnect', () => console.log('socket disconnected', socket.id));
});

app.use('/auth', authRoutes);
app.use('/posts', postsRoutes);
app.use('/events', eventsRoutes);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
