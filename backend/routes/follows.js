import express from 'express';
import pool from '../config/db.js';
import auth from '../middleware/auth.js';

const router = express.Router();

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

    await pool.query(
      'INSERT INTO follows (follower_id, followee_id) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [followerId, followeeId]
    );

    const cntRes = await pool.query(
      'SELECT COUNT(*) AS followers_count FROM follows WHERE followee_id = $1',
      [followeeId]
    );
    const followers_count = cntRes.rows[0].followers_count;

    emit(req, 'follow_updated', { followeeId, followerId, isFollowing: true, followers_count });

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
      'DELETE FROM follows WHERE follower_id = $1 AND followee_id = $2',
      [followerId, followeeId]
    );

    const cntRes = await pool.query(
      'SELECT COUNT(*) AS followers_count FROM follows WHERE followee_id = $1',
      [followeeId]
    );
    const followers_count = cntRes.rows[0].followers_count;

    emit(req, 'follow_updated', { followeeId, followerId, isFollowing: false, followers_count });

    res.json({ message: 'Unfollowed', followers_count });
  } catch (err) {
    console.error('Unfollow error', err);
    res.status(500).json({ error: 'Server error while unfollowing' });
  }
});

// Suggest users to follow
router.get('/suggestions', auth, async (req, res) => {
  try {
    const currentUserId = Number(req.user.id);
    const rowsRes = await pool.query(
      `SELECT u.id, u.username, COUNT(f.follower_id) AS followers_count,
              CASE WHEN fol.follower_id IS NULL THEN 0 ELSE 1 END AS already_following
       FROM users u
       LEFT JOIN follows f ON f.followee_id = u.id
       LEFT JOIN follows fol ON fol.followee_id = u.id AND fol.follower_id = $1
       WHERE u.id != $1
       GROUP BY u.id
       ORDER BY followers_count DESC
       LIMIT 50`,
      [currentUserId]
    );

    res.json(rowsRes.rows);
  } catch (err) {
    console.error('Suggestions error', err);
    res.status(500).json({ error: 'Server error fetching suggestions' });
  }
});

export default router;