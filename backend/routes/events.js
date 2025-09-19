// backend/routes/events.js
import express from 'express';
import pool from '../config/db.js';
import auth from '../middleware/auth.js';

const router = express.Router();

// POST /events
// Body: { postId, event_type, value }
router.post('/', auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const { postId, event_type, value } = req.body;

    if (!postId || !event_type) return res.status(400).json({ error: 'postId and event_type required' });

    // insert event (value stored as JSON)
    await pool.query('INSERT INTO events (user_id, post_id, event_type, value) VALUES (?, ?, ?, ?)',
      [userId, postId, event_type, JSON.stringify(value || null)]
    );

    // if it's a 'view' event, ensure the unique views table has a row (INSERT IGNORE)
    if (event_type === 'view') {
      const [r] = await pool.query('INSERT IGNORE INTO views (user_id, post_id) VALUES (?, ?)', [userId, postId]);
      // if a new row was inserted, emit the updated view count
      if (r.affectedRows > 0) {
        const [cntRows] = await pool.query('SELECT COUNT(*) AS views_count FROM views WHERE post_id = ?', [postId]);
        const views_count = cntRows[0].views_count;
        const io = req.app.get('io');
        if (io) io.emit('post_viewed', { postId: Number(postId), views_count });
      }
    }

    res.json({ ok: true });
  } catch (err) {
    console.error('POST /events error', err);
    res.status(500).json({ error: 'Server error recording event' });
  }
});

export default router;
