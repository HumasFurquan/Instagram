import express from 'express';
import pool from '../config/db.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// GET /messages/:friendId -> fetch conversation
router.get('/:friendId', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const friendId = parseInt(req.params.friendId);

  try {
    const [rows] = await pool.query(
      `SELECT * FROM messages
       WHERE (sender_id = ? AND receiver_id = ?)
          OR (sender_id = ? AND receiver_id = ?)
       ORDER BY created_at ASC`,
      [userId, friendId, friendId, userId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// POST /messages/:friendId -> send message
router.post('/:friendId', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const friendId = parseInt(req.params.friendId);
  const { content } = req.body;

  if (!content || !content.trim()) return res.status(400).json({ error: 'Message cannot be empty' });

  try {
    const [result] = await pool.query(
      `INSERT INTO messages (sender_id, receiver_id, content) VALUES (?, ?, ?)`,
      [userId, friendId, content]
    );

    const [newMessageRows] = await pool.query(
      `SELECT * FROM messages WHERE id = ?`,
      [result.insertId]
    );
    const newMessage = newMessageRows[0];

    // Emit via socket
    const io = req.app.get('io');
    io.to(`user_${friendId}`).emit('newMessage', { message: newMessage });
    io.to(`user_${userId}`).emit('newMessage', { message: newMessage });

    res.json(newMessage);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

export default router;
