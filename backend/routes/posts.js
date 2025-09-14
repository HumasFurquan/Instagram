import express from 'express';
import pool from '../config/db.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// helper to get Socket.IO instance
const getIO = req => req.app.get('io');

// ================= Create a Post =================
router.post('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { content } = req.body;

    const [result] = await pool.query(
      'INSERT INTO posts (user_id, content) VALUES (?, ?)',
      [userId, content]
    );
    const postId = result.insertId;

    const [rows] = await pool.query(
      `SELECT p.id, p.content, p.created_at, u.id AS user_id, u.username
       FROM posts p
       JOIN users u ON p.user_id = u.id
       WHERE p.id = ?`,
      [postId]
    );

    const post = rows[0];
    // broadcast new post
    getIO(req).emit('new_post', post);

    res.status(201).json(post);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while creating post' });
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
    console.error('Error fetching feed:', err);
    res.status(500).json({ error: 'Server error while fetching feed' });
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

    // Get updated like count
    const [rows] = await pool.query(
      'SELECT COUNT(*) as likes_count FROM likes WHERE post_id = ?',
      [postId]
    );
    const likes_count = rows[0].likes_count;

    // Emit via Socket.IO
    const io = req.app.get('io');
    io.emit('post_liked', { postId, likes_count, userId });

    res.json({ message: 'Post liked!', likes_count });
  } catch (err) {
    console.error('Error liking post:', err);
    res.status(500).json({ error: 'Server error while liking post' });
  }
});

router.post('/:postId/unlike', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { postId } = req.params;

    await pool.query('DELETE FROM likes WHERE user_id=? AND post_id=?', [userId, postId]);

    const [rows] = await pool.query(
      'SELECT COUNT(*) as likes_count FROM likes WHERE post_id = ?',
      [postId]
    );
    const likes_count = rows[0].likes_count;

    const io = req.app.get('io');
    io.emit('post_unliked', { postId, likes_count, userId });

    res.json({ message: 'Post unliked!', likes_count });
  } catch (err) {
    console.error('Error unliking post:', err);
    res.status(500).json({ error: 'Server error while unliking post' });
  }
});

// ================= Views =================
router.post('/:postId/view', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { postId } = req.params;

    // Insert only if the user hasn't viewed yet
    const [result] = await pool.query(
      'INSERT IGNORE INTO views (user_id, post_id) VALUES (?, ?)',
      [userId, postId]
    );

    // If new row inserted, emit event to clients
    if (result.affectedRows > 0) {
      // Increment aggregate views count (optional)
      const [rows] = await pool.query(
        'SELECT COUNT(*) AS views_count FROM views WHERE post_id = ?',
        [postId]
      );
      const views_count = rows[0].views_count;

      const io = req.app.get('io');
      io.emit('post_viewed', { postId, views_count });
    }

    res.json({ message: 'View recorded!' });
  } catch (err) {
    console.error('Error recording view:', err);
    res.status(500).json({ error: 'Server error while recording view' });
  }
});


// ================= Comments =================
router.post('/:postId/comment', auth, async (req, res) => {
  try {
    const { content } = req.body;
    const userId = req.user.id;
    const postId = req.params.postId;

    const [result] = await pool.query(
      'INSERT INTO comments (user_id, post_id, content) VALUES (?, ?, ?)',
      [userId, postId, content]
    );

    const commentId = result.insertId;
    const [rows] = await pool.query(
      `SELECT c.id, c.content, c.created_at, u.username
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.id = ?`,
      [commentId]
    );

    const comment = rows[0];
    getIO(req).emit('new_comment', { postId, comment });

    res.status(201).json(comment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while adding comment' });
  }
});

export default router;
