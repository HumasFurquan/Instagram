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
      "INSERT INTO friend_requests (sender_id, receiver_id, status) VALUES (?, ?, 'pending')",
      [senderId, receiverId]
    );

    emit(req, "newFriendRequest", { senderId }, `user_${receiverId}`);

    res.json({ message: "Friend request sent" });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
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
    const [result] = await pool.query(
      "UPDATE friend_requests SET status='accepted' WHERE id=? AND receiver_id=?",
      [requestId, userId]
    );

    if (result.affectedRows === 0) return res.status(404).json({ message: "Request not found" });

    const [reqRow] = await pool.query("SELECT sender_id FROM friend_requests WHERE id=?", [requestId]);
    emit(req, "friendRequestAccepted", { receiverId: userId }, `user_${reqRow[0].sender_id}`);

    res.json({ message: "Friend request accepted" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ---------------- Decline friend request ----------------
router.post("/decline/:requestId", auth, async (req, res) => {
  const userId = req.user.id;
  const requestId = Number(req.params.requestId);

  try {
    const [result] = await pool.query(
      "UPDATE friend_requests SET status='declined' WHERE id=? AND receiver_id=?",
      [requestId, userId]
    );

    if (result.affectedRows === 0) return res.status(404).json({ message: "Request not found" });

    res.json({ message: "Friend request declined" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ---------------- List pending requests ----------------
router.get("/requests", auth, async (req, res) => {
  const userId = req.user.id;
  try {
    const [rows] = await pool.query(
      `SELECT fr.id, fr.sender_id, u.username, u.profile_picture_url
       FROM friend_requests fr
       JOIN users u ON fr.sender_id = u.id
       WHERE fr.receiver_id=? AND fr.status='pending'`,
      [userId]
    );
    res.json(rows);
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

// ---------------- List accepted friends ----------------
router.get("/", auth, async (req, res) => {
  const userId = req.user.id;
  try {
    const [rows] = await pool.query(
      `SELECT u.id, u.username, u.profile_picture_url
       FROM friend_requests fr
       JOIN users u ON (u.id=fr.sender_id OR u.id=fr.receiver_id) AND u.id!=?
       WHERE (fr.sender_id=? OR fr.receiver_id=?) AND fr.status='accepted'`,
      [userId, userId, userId]
    );
    res.json(rows);
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
    const [result] = await pool.query(
      `DELETE FROM friend_requests 
       WHERE status='accepted' 
       AND ((sender_id=? AND receiver_id=?) OR (sender_id=? AND receiver_id=?))`,
      [userId, friendId, friendId, userId]
    );

    if (result.affectedRows === 0) {
      return res.status(404).json({ message: "Friend not found" });
    }

    // Emit a socket event if needed
    emit(req, "friendRemoved", { userId, friendId });

    res.json({ message: "Friend removed successfully" });
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Internal server error" });
  }
});

export default router;
