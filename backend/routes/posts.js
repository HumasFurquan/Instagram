// backend/routes/posts.js
import express from 'express';
import pool from '../config/db.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// Helper to emit safely
function emit(req, event, payload) {
  const io = req.app.get('io');
  if (io) io.emit(event, payload);
}

// ---------------- Create a Post ----------------
router.post('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { content } = req.body;
    if (!content || !content.trim()) return res.status(400).json({ error: 'Content required' });

    const [result] = await pool.query('INSERT INTO posts (user_id, content) VALUES (?, ?)', [userId, content]);
    const postId = result.insertId;

    const [rows] = await pool.query(
      `SELECT p.id, p.content, p.created_at, u.id AS user_id, u.username
       FROM posts p JOIN users u ON p.user_id = u.id
       WHERE p.id = ?`,
      [postId]
    );
    const newPost = rows[0];

    // Add initial counts so frontends don't need extra requests
    newPost.likes_count = 0;
    newPost.views_count = 0;
    newPost.comments_count = 0;
    newPost.liked = 0;

    emit(req, 'new_post', newPost);

    res.status(201).json(newPost);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------------- Feed (auth required) ----------------
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

// ---------------- Like ----------------
router.post('/:postId/like', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { postId } = req.params;

    await pool.query('INSERT IGNORE INTO likes (user_id, post_id) VALUES (?, ?)', [userId, postId]);

    const [cntRows] = await pool.query('SELECT COUNT(*) AS likes_count FROM likes WHERE post_id = ?', [postId]);
    const likes_count = cntRows[0].likes_count;

    // emit updated count and actor id
    emit(req, 'post_liked', { postId: Number(postId), likes_count, userId });

    res.json({ message: 'Post liked', likes_count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------------- Unlike (DELETE) ----------------
router.delete('/:postId/like', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { postId } = req.params;

    await pool.query('DELETE FROM likes WHERE user_id = ? AND post_id = ?', [userId, postId]);

    const [cntRows] = await pool.query('SELECT COUNT(*) AS likes_count FROM likes WHERE post_id = ?', [postId]);
    const likes_count = cntRows[0].likes_count;

    // emit updated count and actor id
    emit(req, 'post_unliked', { postId: Number(postId), likes_count, userId });

    res.json({ message: 'Post unliked', likes_count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// Optional compatibility route for clients using POST /unlike
router.post('/:postId/unlike', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { postId } = req.params;

    await pool.query('DELETE FROM likes WHERE user_id = ? AND post_id = ?', [userId, postId]);

    const [cntRows] = await pool.query('SELECT COUNT(*) AS likes_count FROM likes WHERE post_id = ?', [postId]);
    const likes_count = cntRows[0].likes_count;

    emit(req, 'post_unliked', { postId: Number(postId), likes_count, userId });

    res.json({ message: 'Post unliked', likes_count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ---------------- Views ----------------
router.post('/:postId/view', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { postId } = req.params;

    const [result] = await pool.query('INSERT IGNORE INTO views (user_id, post_id) VALUES (?, ?)', [userId, postId]);

    if (result.affectedRows > 0) {
      const [cntRows] = await pool.query('SELECT COUNT(*) AS views_count FROM views WHERE post_id = ?', [postId]);
      const views_count = cntRows[0].views_count;
      emit(req, 'post_viewed', { postId: Number(postId), views_count });
      return res.json({ message: 'View recorded', views_count });
    } else {
      return res.json({ message: 'Already viewed' });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while recording view' });
  }
});

// ---------------- Comments ----------------
// Get comments for a post
router.get('/:id/comments', auth, async (req, res) => {
  try {
    const postId = req.params.id;
    const [rows] = await pool.query(
      `SELECT c.id, c.content, c.created_at, u.id AS user_id, u.username
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.post_id = ?
       ORDER BY c.created_at DESC`,
      [postId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not load comments' });
  }
});

// Add a comment to a post
router.post('/:id/comment', auth, async (req, res) => {
  try {
    const { content } = req.body;
    const userId = req.user.id;
    const postId = req.params.id;

    if (!content || content.trim() === '') return res.status(400).json({ error: 'Comment content is required' });

    const [result] = await pool.query('INSERT INTO comments (user_id, post_id, content) VALUES (?, ?, ?)', [userId, postId, content]);
    const commentId = result.insertId;

    const [rows] = await pool.query(
      `SELECT c.id, c.content, c.created_at, u.id AS user_id, u.username
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.id = ?`,
      [commentId]
    );

    const newComment = rows[0];

    // emit to others: include postId and comment (including user_id)
    emit(req, 'new_comment', { postId: Number(postId), comment: newComment });

    res.status(201).json(newComment);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Could not add comment' });
  }
});

export default router;
