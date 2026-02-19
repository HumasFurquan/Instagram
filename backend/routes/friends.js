// backend/routes/friends.js
import express from "express";
import pool from "../config/db.js";
import auth from "../middleware/auth.js";

const router = express.Router();

// Helper to emit safely
function emit(req, event, payload, room) {
  const io = req.app.get("io");
  if (io) {
    if (room) io.to(room).emit(event, payload);
    else io.emit(event, payload);
  }
}

// ---------------- Send friend request ----------------
router.post("/request/:receiverId", auth, async (req, res) => {
  const senderId = req.user.id;
  const receiverId = Number(req.params.receiverId);

  if (senderId === receiverId) return res.status(400).json({ message: "Can't friend yourself" });

  try {
    await pool.query(
      "INSERT INTO friend_requests (sender_id, receiver_id, status) VALUES ($1, $2, 'pending')",
      [senderId, receiverId]
    );

    emit(req, "newFriendRequest", { senderId }, `user_${receiverId}`);

    res.json({ message: "Friend request sent" });
  } catch (err) {
    if (err.code === "23505") { // PostgreSQL unique violation
      return res.status(400).json({ message: "Request already exists" });
    }
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ---------------- Accept friend request ----------------
router.post("/accept/:requestId", auth, async (req, res) => {
  const userId = req.user.id;
  const requestId = Number(req.params.requestId);

  try {
    const result = await pool.query(
      "UPDATE friend_requests SET status='accepted' WHERE id=$1 AND receiver_id=$2",
      [requestId, userId]
    );

    if (result.rowCount === 0) return res.status(404).json({ message: "Request not found" });

    const reqRow = await pool.query("SELECT sender_id FROM friend_requests WHERE id=$1", [requestId]);
    emit(req, "friendRequestAccepted", { receiverId: userId }, `user_${reqRow.rows[0].sender_id}`);

    res.json({ message: "Friend request accepted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ---------------- Decline friend request (delete row) ----------------
router.post("/decline/:requestId", auth, async (req, res) => {
  const userId = req.user.id;
  const requestId = Number(req.params.requestId);

  try {
    const result = await pool.query(
      "DELETE FROM friend_requests WHERE id=$1 AND receiver_id=$2",
      [requestId, userId]
    );

    if (result.rowCount === 0) return res.status(404).json({ message: "Request not found" });

    res.json({ message: "Friend request declined (deleted)" });
  } catch (err) {
    console.error("Decline friend request error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ---------------- List pending requests ----------------
router.get("/requests", auth, async (req, res) => {
  const userId = req.user.id;
  try {
    const rows = await pool.query(
      `SELECT fr.id, fr.sender_id, u.username, u.profile_picture_url
       FROM friend_requests fr
       JOIN users u ON fr.sender_id = u.id
       WHERE fr.receiver_id=$1 AND fr.status='pending'`,
      [userId]
    );
    res.json(rows.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ---------------- List requests sent by current user ----------------
router.get("/sent", auth, async (req, res) => {
  const userId = req.user.id;
  try {
    const rows = await pool.query(
      `SELECT fr.id, fr.receiver_id AS id, u.username, u.profile_picture_url
       FROM friend_requests fr
       JOIN users u ON fr.receiver_id = u.id
       WHERE fr.sender_id=$1 AND fr.status='pending'`,
      [userId]
    );
    res.json(rows.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ---------------- List accepted friends ----------------
router.get("/", auth, async (req, res) => {
  const userId = req.user.id;
  try {
    const rows = await pool.query(
      `SELECT u.id, u.username, u.profile_picture_url
       FROM friend_requests fr
       JOIN users u ON (u.id = fr.sender_id OR u.id = fr.receiver_id) AND u.id != $1
       WHERE (fr.sender_id = $2 OR fr.receiver_id = $3) AND fr.status = 'accepted'`,
      [userId, userId, userId]
    );
    res.json(rows.rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ---------------- Unfriend a user ----------------
router.delete("/:friendId", auth, async (req, res) => {
  const userId = req.user.id;
  const friendId = Number(req.params.friendId);

  try {
    const result = await pool.query(
      `DELETE FROM friend_requests 
       WHERE status = 'accepted' 
       AND ((sender_id = $1 AND receiver_id = $2) OR (sender_id = $3 AND receiver_id = $4))`,
      [userId, friendId, friendId, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({ message: "Friend not found" });
    }

    emit(req, "friendRemoved", { userId, friendId });

    res.json({ message: "Friend removed successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;