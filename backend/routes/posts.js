import express from 'express';
import pool from '../config/db.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// ================= Create a Post =================
router.post('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { content } = req.body;
    if (!content) return res.status(400).json({ error: 'Content required' });

    const [result] = await pool.query(
      'INSERT INTO posts (user_id, content) VALUES (?, ?)',
      [userId, content]
    );
    const postId = result.insertId;

    const [rows] = await pool.query(
      `SELECT p.id, p.content, p.created_at, u.id AS user_id, u.username
       FROM posts p JOIN users u ON p.user_id = u.id
       WHERE p.id = ?`,
      [postId]
    );

    res.json(rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ================= Feed (Auth Required) =================
router.get('/', auth, async (req, res) => {
  try {
    const currentUserId = req.user.id;

    const [rows] = await pool.query(
      `SELECT
         p.id, p.content, p.created_at,
         u.id AS user_id, u.username,
         COUNT(DISTINCT l.id) AS likes_count,
         COUNT(DISTINCT v.id) AS views_count,
         COUNT(DISTINCT c.id) AS comments_count,
         MAX(CASE WHEN l.user_id = ? THEN 1 ELSE 0 END) AS liked
       FROM posts p
       JOIN users u ON p.user_id = u.id
       LEFT JOIN likes l ON l.post_id = p.id
       LEFT JOIN views v ON v.post_id = p.id
       LEFT JOIN comments c ON c.post_id = p.id
       GROUP BY p.id, p.content, p.created_at, u.id, u.username
       ORDER BY p.created_at DESC
       LIMIT 50`,
      [currentUserId]
    );

    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ================= Likes =================
router.post('/:postId/like', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { postId } = req.params;
    await pool.query(
      'INSERT IGNORE INTO likes (user_id, post_id) VALUES (?, ?)',
      [userId, postId]
    );
    res.json({ message: 'Post liked!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ================= Views =================
router.post('/:postId/view', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { postId } = req.params;
    await pool.query(
      'INSERT IGNORE INTO views (user_id, post_id) VALUES (?, ?)',
      [userId, postId]
    );
    res.json({ message: 'View recorded!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ================= Comments =================
router.post('/:postId/comment', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { text } = req.body;
    const { postId } = req.params;

    if (!text) return res.status(400).json({ error: 'Comment text required' });

    await pool.query(
      'INSERT INTO comments (user_id, post_id, text) VALUES (?, ?, ?)',
      [userId, postId, text]
    );
    res.json({ message: 'Comment added!' });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

router.get('/:postId/comments', auth, async (req, res) => {
  try {
    const { postId } = req.params;
    const [rows] = await pool.query(
      `SELECT c.id, c.text, c.created_at, u.username
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.post_id = ?
       ORDER BY c.created_at DESC`,
      [postId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
