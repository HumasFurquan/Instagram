// backend/routes/posts.js
import express from 'express';
import pool from '../config/db.js';
import auth from '../middleware/auth.js';

const router = express.Router();

/* CREATE POST (protected) */
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
    // broadcast new post to everyone
    const io = req.app.get('io');
    if (io) io.emit('new_post', newPost);

    res.status(201).json(newPost);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error' });
  }
});

/* GET FEED (protected, so server can calculate `liked` for current user) */
router.get('/', auth, async (req, res) => {
  try {
    const currentUserId = req.user?.id || null;
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

/* LIKE / UNLIKE */
router.post('/:postId/like', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { postId } = req.params;

    const [ins] = await pool.query('INSERT IGNORE INTO likes (user_id, post_id) VALUES (?, ?)', [userId, postId]);

    const [cntRows] = await pool.query('SELECT COUNT(*) AS likes_count FROM likes WHERE post_id = ?', [postId]);
    const likes_count = cntRows[0].likes_count;

    const io = req.app.get('io');
    if (io && ins.affectedRows > 0) {
      io.emit('post_liked', { postId: Number(postId), likes_count, userId });
    }
    res.json({ message: 'Post liked', likes_count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while liking' });
  }
});

router.delete('/:postId/like', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { postId } = req.params;

    const [del] = await pool.query('DELETE FROM likes WHERE user_id = ? AND post_id = ?', [userId, postId]);

    const [cntRows] = await pool.query('SELECT COUNT(*) AS likes_count FROM likes WHERE post_id = ?', [postId]);
    const likes_count = cntRows[0].likes_count;

    const io = req.app.get('io');
    if (io && del.affectedRows > 0) {
      io.emit('post_unliked', { postId: Number(postId), likes_count, userId });
    }
    res.json({ message: 'Unliked', likes_count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while unliking' });
  }
});

/* VIEWS */
router.post('/:postId/view', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { postId } = req.params;
    await pool.query('INSERT IGNORE INTO views (user_id, post_id) VALUES (?, ?)', [userId, postId]);

    const [cntRows] = await pool.query('SELECT COUNT(*) AS views_count FROM views WHERE post_id = ?', [postId]);
    const views_count = cntRows[0].views_count;

    const io = req.app.get('io');
    if (io) io.emit('post_viewed', { postId: Number(postId), views_count });

    res.json({ message: 'View recorded', views_count });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Server error while recording view' });
  }
});

/* COMMENTS */

/* Get comments for a post (public read) */
router.get('/:postId/comments', async (req, res) => {
  try {
    const { postId } = req.params;
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
    console.error('Error fetching comments:', err);
    res.status(500).json({ error: 'Could not load comments' });
  }
});

/* Add a comment (protected) */
router.post('/:postId/comment', auth, async (req, res) => {
  try {
    const { postId } = req.params;
    const userId = req.user.id;
    const { content } = req.body;

    if (!content || content.trim() === '') {
      return res.status(400).json({ error: 'Comment content is required' });
    }

    const [result] = await pool.query(
      'INSERT INTO comments (user_id, post_id, content) VALUES (?, ?, ?)',
      [userId, postId, content]
    );

    const commentId = result.insertId;

    const [rows] = await pool.query(
      `SELECT c.id, c.content, c.created_at, u.id AS user_id, u.username
       FROM comments c
       JOIN users u ON c.user_id = u.id
       WHERE c.id = ?`,
      [commentId]
    );

    const newComment = rows[0];

    const io = req.app.get('io');
    if (io) io.emit('new_comment', { postId: Number(postId), comment: newComment });

    res.status(201).json(newComment);
  } catch (err) {
    console.error('Error adding comment:', err);
    res.status(500).json({ error: 'Could not add comment' });
  }
});

export default router;
