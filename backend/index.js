import express from 'express';
import http from 'http';
import cors from 'cors';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import pool from './config/db.js'; // import your DB connection
import { Server } from 'socket.io';
dotenv.config();

import authRoutes from './routes/auth.js';
import postsRoutes from './routes/posts.js';
import eventsRoutes from './routes/events.js';
import followsRoutes from './routes/follows.js';
import userRoutes from './routes/users.js';
import friendsRoutes from './routes/friends.js';
import messagesRoutes from './routes/messages.js';

const app = express();
const httpServer = http.createServer(app);

const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:3000',
  'https://instagram-frontend-kohl.vercel.app',
  'https://frozenapple.vercel.app',
  'https://frozenapple.netlify.app'
];

app.use(
  cors({
    origin: function (origin, callback) {
      if (!origin) return callback(null, true);

      if (!allowedOrigins.includes(origin)) {
        return callback(
          new Error(`CORS not allowed for ${origin}`),
          false
        );
      }

      return callback(null, true);
    },
    credentials: true,
    allowedHeaders: ['Content-Type', 'Authorization'],
  })
);

app.use(express.json());

const io = new Server(httpServer, {
  cors: {
    origin: allowedOrigins,
    methods: ['GET', 'POST', 'DELETE'],
    credentials: true,
  },
});

// attach io to app so routes can emit: req.app.get('io')
app.set('io', io);

// ------------------- Socket authentication & rooms -------------------
io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication error: No token'));

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = payload.id; // store userId on socket
    next();
  } catch (err) {
    console.log('Socket auth error', err);
    next(new Error('Authentication error: Invalid token'));
  }
});

io.on('connection', socket => {
  const userId = socket.userId;
  console.log(`User ${userId} connected via socket ${socket.id}`);

  // Join personal room
  socket.join(`user_${userId}`);

  // ----------------- Likes -----------------
  socket.on('likePost', async ({ postId }) => {
    try {
      // Insert like
      await pool.query('INSERT IGNORE INTO likes (user_id, post_id) VALUES (?, ?)', [userId, postId]);

      // Get updated likes count and post owner
      const [rows] = await pool.query('SELECT user_id FROM posts WHERE id = ?', [postId]);
      if (!rows[0]) return;
      const postOwnerId = rows[0].user_id;

      const [cntRows] = await pool.query('SELECT COUNT(*) AS likes_count FROM likes WHERE post_id = ?', [postId]);
      const likes_count = cntRows[0].likes_count;

      // Notify post owner and self
      io.to(`user_${postOwnerId}`).emit('postLiked', { postId, userId, likes_count });
      io.to(`user_${userId}`).emit('postLiked', { postId, userId, likes_count });

    } catch (err) {
      console.error('Error liking post:', err);
      socket.emit('error', { type: 'likePost', message: 'Failed to like post' });
    }
  });

  socket.on('unlikePost', async ({ postId }) => {
    try {
      await pool.query('DELETE FROM likes WHERE user_id = ? AND post_id = ?', [userId, postId]);

      // Get updated likes count and post owner
      const [rows] = await pool.query('SELECT user_id FROM posts WHERE id = ?', [postId]);
      if (!rows[0]) return;
      const postOwnerId = rows[0].user_id;

      const [cntRows] = await pool.query('SELECT COUNT(*) AS likes_count FROM likes WHERE post_id = ?', [postId]);
      const likes_count = cntRows[0].likes_count;

      io.to(`user_${postOwnerId}`).emit('postUnliked', { postId, userId, likes_count });
      io.to(`user_${userId}`).emit('postUnliked', { postId, userId, likes_count });

    } catch (err) {
      console.error('Error unliking post:', err);
    }
  });

  // ----------------- Disconnect -----------------
  socket.on('disconnect', () => {
    console.log(`User ${userId} disconnected from socket ${socket.id}`);
  });
  
  // ----------------- Messaging -----------------
  socket.on('sendMessage', async ({ receiverId, content }) => {
    try {
      // Save the message to DB
      const [result] = await pool.query(
        'INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)',
        [socket.userId, receiverId, content]
      );

      const [rows] = await pool.query('SELECT * FROM messages WHERE id = ?', [result.insertId]);
      const message = rows[0];

      // Emit to sender and receiver instantly
      io.to(`user_${receiverId}`).emit('new_message', message);
      io.to(`user_${socket.userId}`).emit('new_message', message);

    } catch (err) {
      console.error('Error sending message:', err);
    }
  });

  // ----------------- Call Signaling -----------------
  socket.on('call:offer', ({ receiverId, offer, meta }) => {
    io.to(`user_${receiverId}`).emit('call:offer', {
      offer,
      callerId: socket.userId,
      meta: meta || {}
    });
  });

  socket.on('call:answer', ({ callerId, answer }) => {
    io.to(`user_${callerId}`).emit('call:answer', {
      answer,
      calleeId: socket.userId
    });
  });

  socket.on('call:ice-candidate', ({ targetId, candidate }) => {
    io.to(`user_${targetId}`).emit('call:ice-candidate', {
      candidate,
      fromId: socket.userId
    });
  });

  socket.on('call:hangup', ({ targetId }) => {
    io.to(`user_${targetId}`).emit('call:hangup', { fromId: socket.userId });
  });

  socket.on('call:reject', ({ callerId }) => {
    io.to(`user_${callerId}`).emit('call:rejected', { fromId: socket.userId });
  });

  // ----------------- Video Call Signaling -----------------
  socket.on('video:offer', ({ receiverId, offer, meta }) => {
    io.to(`user_${receiverId}`).emit('video:offer', {
      offer,
      callerId: socket.userId,
      meta: meta || {}
    });
  });

  socket.on('video:answer', ({ callerId, answer }) => {
    io.to(`user_${callerId}`).emit('video:answer', {
      answer,
      calleeId: socket.userId
    });
  });

  socket.on('video:ice-candidate', ({ targetId, candidate }) => {
    io.to(`user_${targetId}`).emit('video:ice-candidate', {
      candidate,
      fromId: socket.userId
    });
  });

  socket.on('video:hangup', ({ targetId }) => {
    io.to(`user_${targetId}`).emit('video:hangup', { fromId: socket.userId });
  });

  socket.on('video:reject', ({ callerId }) => {
    io.to(`user_${callerId}`).emit('video:rejected', { fromId: socket.userId });
  });
});

// ------------------- Routes -------------------
app.use('/auth', authRoutes);
app.use('/posts', postsRoutes);
app.use('/events', eventsRoutes);
app.use('/follows', followsRoutes);
app.use('/users', userRoutes);
app.use('/friends', friendsRoutes);
app.use('/messages', messagesRoutes);

const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => console.log(`Backend running on port ${PORT}`));