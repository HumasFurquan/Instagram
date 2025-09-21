import express from 'express';
import pool from '../config/db.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// GET /users/search?query=abc
router.get('/search', async (req, res) => {
  const { query } = req.query;
  if (!query) {
    return res.status(400).json({ error: 'Query is required' });
  }

  try {
    const [users] = await pool.query(
      'SELECT id, username FROM users WHERE username LIKE ? LIMIT 3',
      [`${query}%`]
    );
    res.json(users);
  } catch (err) {
    console.error('User search error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

// ✅ GET /users/:userId/posts
router.get('/:userId/posts', auth, async (req, res) => {
  const { userId } = req.params;
  const currentUserId = req.user.id;

  try {
    const [posts] = await pool.query(
      `SELECT 
            p.id, 
            p.content, 
            p.created_at,
            p.user_id,   -- 👈 add this
            u.username,
            EXISTS(SELECT 1 FROM follows f WHERE f.follower_id = ? AND f.followee_id = p.user_id) AS is_following_author,
            EXISTS(SELECT 1 FROM likes l WHERE l.user_id = ? AND l.post_id = p.id) AS liked,
            (SELECT COUNT(*) FROM likes l2 WHERE l2.post_id = p.id) AS likes_count,
            (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comments_count,
            (SELECT COUNT(*) FROM views v WHERE v.post_id = p.id) AS views_count
        FROM posts p
        JOIN users u ON u.id = p.user_id
        WHERE p.user_id = ?
        ORDER BY p.created_at DESC`,
      [currentUserId, currentUserId, userId]
    );

    res.json(posts);
  } catch (err) {
    console.error('User posts error:', err);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
