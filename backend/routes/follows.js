// backend/routes/follows.js
import express from 'express';
import pool from '../config/db.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// helper to emit via socket if available
function emit(req, event, payload) {
  const io = req.app.get('io');
  if (io) io.emit(event, payload);
}

// Follow a user
router.post('/:userId', auth, async (req, res) => {
  try {
    const followerId = Number(req.user.id);
    const followeeId = Number(req.params.userId);
    if (followerId === followeeId) return res.status(400).json({ error: 'Cannot follow yourself' });

    await pool.query('INSERT IGNORE INTO follows (follower_id, followee_id) VALUES (?, ?)', [followerId, followeeId]);

    const [cnt] = await pool.query('SELECT COUNT(*) AS followers_count FROM follows WHERE followee_id = ?', [followeeId]);
    const followers_count = cnt[0].followers_count;

    // emit to other clients (optional)
    emit(req, 'user_followed', { followeeId, followerId, followers_count });

    res.json({ message: 'Followed', followers_count });
  } catch (err) {
    console.error('Follow error', err);
    res.status(500).json({ error: 'Server error while following' });
  }
});

// Unfollow a user
router.delete('/:userId', auth, async (req, res) => {
  try {
    const followerId = Number(req.user.id);
    const followeeId = Number(req.params.userId);
    if (followerId === followeeId) return res.status(400).json({ error: 'Cannot unfollow yourself' });

    await pool.query('DELETE FROM follows WHERE follower_id = ? AND followee_id = ?', [followerId, followeeId]);

    const [cnt] = await pool.query('SELECT COUNT(*) AS followers_count FROM follows WHERE followee_id = ?', [followeeId]);
    const followers_count = cnt[0].followers_count;

    emit(req, 'user_unfollowed', { followeeId, followerId, followers_count });

    res.json({ message: 'Unfollowed', followers_count });
  } catch (err) {
    console.error('Unfollow error', err);
    res.status(500).json({ error: 'Server error while unfollowing' });
  }
});

// Suggest users to follow (top by follower count) — excludes self and already followed
router.get('/suggestions', auth, async (req, res) => {
  try {
    const currentUserId = Number(req.user.id);
    const [rows] = await pool.query(
      `SELECT u.id, u.username, COUNT(f.follower_id) AS followers_count,
              CASE WHEN fol.follower_id IS NULL THEN 0 ELSE 1 END AS already_following
       FROM users u
       LEFT JOIN follows f ON f.followee_id = u.id
       LEFT JOIN follows fol ON fol.followee_id = u.id AND fol.follower_id = ?
       WHERE u.id != ?
       GROUP BY u.id
       ORDER BY followers_count DESC
       LIMIT 50`,
      [currentUserId, currentUserId]
    );

    res.json(rows);
  } catch (err) {
    console.error('Suggestions error', err);
    res.status(500).json({ error: 'Server error fetching suggestions' });
  }
});

// Follow a user
router.post('/:userId', auth, async (req, res) => {
  try {
    const followerId = Number(req.user.id);
    const followeeId = Number(req.params.userId);
    if (followerId === followeeId) return res.status(400).json({ error: 'Cannot follow yourself' });

    await pool.query(
      'INSERT IGNORE INTO follows (follower_id, followee_id) VALUES (?, ?)',
      [followerId, followeeId]
    );

    const [cnt] = await pool.query(
      'SELECT COUNT(*) AS followers_count FROM follows WHERE followee_id = ?',
      [followeeId]
    );
    const followers_count = cnt[0].followers_count;

    // ✅ unified event
    emit(req, 'follow_updated', { 
      followeeId, 
      followerId, 
      isFollowing: true, 
      followers_count 
    });

    res.json({ message: 'Followed', followers_count });
  } catch (err) {
    console.error('Follow error', err);
    res.status(500).json({ error: 'Server error while following' });
  }
});

// Unfollow a user
router.delete('/:userId', auth, async (req, res) => {
  try {
    const followerId = Number(req.user.id);
    const followeeId = Number(req.params.userId);
    if (followerId === followeeId) return res.status(400).json({ error: 'Cannot unfollow yourself' });

    await pool.query(
      'DELETE FROM follows WHERE follower_id = ? AND followee_id = ?',
      [followerId, followeeId]
    );

    const [cnt] = await pool.query(
      'SELECT COUNT(*) AS followers_count FROM follows WHERE followee_id = ?',
      [followeeId]
    );
    const followers_count = cnt[0].followers_count;

    // ✅ unified event
    emit(req, 'follow_updated', { 
      followeeId, 
      followerId, 
      isFollowing: false, 
      followers_count 
    });

    res.json({ message: 'Unfollowed', followers_count });
  } catch (err) {
    console.error('Unfollow error', err);
    res.status(500).json({ error: 'Server error while unfollowing' });
  }
});

export default router;
