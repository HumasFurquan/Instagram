import express from "express";
import multer from "multer";
import cloudinary from "../config/cloudinary.js";
import pool from "../config/db.js";
import auth from "../middleware/auth.js";

const router = express.Router();
const upload = multer({ dest: "uploads/" });

// ============================
// User search
// ============================
router.get("/search", async (req, res) => {
  const { query } = req.query;
  if (!query) return res.status(400).json({ error: "Query is required" });

  try {
    const result = await pool.query(
      `SELECT id, username, profile_picture_url 
       FROM users 
       WHERE username ILIKE $1
       LIMIT 3`,
      [`${query}%`]
    );
    res.json(result.rows);
  } catch (err) {
    console.error("User search error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ============================
// Get current user profile
// ============================
router.get("/me", auth, async (req, res) => {
  try {
    const userId = req.user.id;
    const result = await pool.query(
      `SELECT id, username, profile_picture_url, is_private 
       FROM users 
       WHERE id = $1`,
      [userId]
    );

    if (!result.rows.length) return res.status(404).json({ error: "User not found" });
    res.json(result.rows[0]);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// ============================
// Get single user profile
// ============================
router.get("/:id", auth, async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const currentUserId = req.user.id;

    const result = await pool.query(
      `SELECT id, username, profile_picture_url, profile_picture_public_id, is_private
       FROM users
       WHERE id = $1`,
      [userId]
    );

    if (result.rows.length === 0)
      return res.status(404).json({ error: "User not found" });

    const user = result.rows[0];

    // Hide profile picture if private and not the same user
    if (user.is_private && currentUserId !== userId) {
      user.profile_picture_url = null;
    }

    res.json(user);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Failed to fetch user" });
  }
});

// ============================
// Get user posts
// ============================
router.get("/:userId/posts", auth, async (req, res) => {
  const userId = parseInt(req.params.userId);
  const currentUserId = req.user.id;

  try {
    const result = await pool.query(
      `SELECT 
         p.id,
         p.content,
         p.created_at,
         p.user_id,
         u.username,
         u.profile_picture_url,
         EXISTS(SELECT 1 FROM follows f WHERE f.follower_id = $1 AND f.followee_id = p.user_id) AS is_following_author,
         EXISTS(SELECT 1 FROM likes l WHERE l.user_id = $2 AND l.post_id = p.id) AS liked,
         (SELECT COUNT(*) FROM likes l2 WHERE l2.post_id = p.id) AS likes_count,
         (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comments_count,
         (SELECT COUNT(*) FROM views v WHERE v.post_id = p.id) AS views_count
       FROM posts p
       JOIN users u ON u.id = p.user_id
       WHERE p.user_id = $3
       ORDER BY p.created_at DESC`,
      [currentUserId, currentUserId, userId]
    );

    res.json(result.rows);
  } catch (err) {
    console.error("User posts error:", err);
    res.status(500).json({ error: "Server error" });
  }
});

// ============================
// Upload profile picture
// ============================
router.post("/:id/profile-picture", upload.single("image"), async (req, res) => {
  try {
    const userId = parseInt(req.params.id);

    const result = await cloudinary.uploader.upload(req.file.path, {
      folder: "profile_pictures",
    });

    await pool.query(
      `UPDATE users 
       SET profile_picture_url = $1, profile_picture_public_id = $2
       WHERE id = $3`,
      [result.secure_url, result.public_id, userId]
    );

    // return both
    res.json({
      url: result.secure_url,
      public_id: result.public_id,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Upload failed" });
  }
});

// ============================
// Delete profile picture
// ============================
router.delete("/:id/profile-picture", async (req, res) => {
  try {
    const userId = parseInt(req.params.id);
    const { public_id } = req.body; // frontend sends public_id

    if (public_id) {
      await cloudinary.uploader.destroy(public_id);
    }

    await pool.query(
      `UPDATE users 
       SET profile_picture_url = NULL, profile_picture_public_id = NULL
       WHERE id = $1`,
      [userId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "Delete failed" });
  }
});

// ============================
// Toggle profile privacy
// ============================
router.patch("/privacy", auth, async (req, res) => {
  try {
    const userId = req.user.id;         // get userId from auth token
    const { is_private } = req.body;

    if (typeof is_private !== "boolean") {
      return res.status(400).json({ error: "is_private must be boolean" });
    }

    await pool.query(
      "UPDATE users SET is_private = $1 WHERE id = $2",
      [is_private, userId]
    );

    res.json({ success: true, is_private });
  } catch (err) {
    console.error("Privacy toggle error:", err);
    res.status(500).json({ error: "Failed to update privacy" });
  }
});

export default router;