import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import http from 'http';
import { Server } from "socket.io";

import authRoutes from './routes/auth.js';
import postsRoutes from './routes/posts.js';

dotenv.config();
const app = express();
const server = http.createServer(app);

// Setup Socket.IO
const io = new Server(server, {
  cors: {
    origin: ["http://localhost:5173", "https://frozenapple.vercel.app"],
    credentials: true
  }
});
app.set("io", io);  // pass io to routes

app.use(cors({
  origin: ["http://localhost:5173", "https://frozenapple.vercel.app"],
  credentials: true,
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());

// Routes
app.use('/auth', authRoutes);
app.use('/posts', postsRoutes);

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => console.log(`Backend running on port ${PORT}`));
