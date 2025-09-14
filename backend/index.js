// backend/index.js
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
dotenv.config();

import authRoutes from './routes/auth.js';
import postsRoutes from './routes/posts.js';

const app = express();

// CORS setup: allow multiple origins dynamically
const allowedOrigins = [
  'http://localhost:5173',          // local frontend (dev)
  'https://frozenapple.vercel.app'  // deployed frontend (prod)
];

app.use(cors({
  origin: function(origin, callback) {
    // allow requests with no origin (e.g., Postman, mobile apps)
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) === -1) {
      return callback(new Error(`CORS policy does not allow access from ${origin}`), false);
    }
    return callback(null, true);
  },
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

app.use('/auth', authRoutes);
app.use('/posts', postsRoutes);

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
