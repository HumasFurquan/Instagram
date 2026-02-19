import express from 'express';
import pool from '../config/db.js';
import authMiddleware from '../middleware/auth.js';

const router = express.Router();

// GET /messages/:friendId -> fetch conversation
router.get('/:friendId', authMiddleware, async (req, res) => {
  const userId = req.user.id;
  const friendId = parseInt(req.params.friendId);

  try {
    const result = await pool.query(
      `SELECT * FROM messages
       WHERE (sender_id = $1 AND receiver_id = $2)
          OR (sender_id = $3 AND receiver_id = $4)
       ORDER BY created_at ASC`,
      [userId, friendId, friendId, userId]
    );
    res.json(result.rows);
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
    const result = await pool.query(
      `INSERT INTO messages (sender_id, receiver_id, content)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [userId, friendId, content]
    );

    const messageId = result.rows[0].id;

    const newMessageResult = await pool.query(
      `SELECT * FROM messages WHERE id = $1`,
      [messageId]
    );
    const newMessage = newMessageResult.rows[0];

    // Emit via socket
    const io = req.app.get('io');
    if (io) {
      io.to(`user_${friendId}`).emit('newMessage', { message: newMessage });
      io.to(`user_${userId}`).emit('newMessage', { message: newMessage });
    }

    res.json(newMessage);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Failed to send message' });
  }
});

export default router;