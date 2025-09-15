// src/components/PostItem.jsx
import React, { useEffect, useState } from "react";
import api from "../api";
import CommentsSection from "./CommentsSection"; // keep if you have it

export default function PostItem({ post, user, authHeaders }) {
  const [localPost, setLocalPost] = useState(post);
  const [showComments, setShowComments] = useState(false);

  // <-- CRITICAL: sync local state when parent post prop updates (socket / server updates)
  useEffect(() => {
    setLocalPost(post);
  }, [post]);

  async function toggleLike() {
    if (!user) return; // silently ignore per your instruction

    const wasLiked = !!localPost.liked;

    // optimistic toggle
    setLocalPost(prev => ({ ...prev, liked: !prev.liked }));

    try {
      if (!wasLiked) {
        // like
        await api.post(`/posts/${localPost.id}/like`, {}, { headers: authHeaders() });
      } else {
        // unlike
        try {
          await api.delete(`/posts/${localPost.id}/like`, { headers: authHeaders() });
        } catch (e) {
          // fallback if server doesn't implement DELETE
          await api.post(`/posts/${localPost.id}/unlike`, {}, { headers: authHeaders() });
        }
      }
      // do NOT change localPost here beyond optimistic update — server emits and Feed will sync
    } catch (err) {
      // revert on error
      setLocalPost(prev => ({ ...prev, liked: wasLiked }));
      console.error("Like action failed", err);
      // no alert as you asked
    }
  }

  return (
    <div style={{ border: "1px solid #ddd", padding: 8, marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <b>{localPost.username}</b>{" "}
          <small style={{ color: "#666" }}>{new Date(localPost.created_at).toLocaleString()}</small>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 13, color: "#333" }}>
            {localPost.views_count ?? 0} views · {localPost.comments_count ?? 0} comments
            {/* intentionally NOT showing the likes number */}
          </div>
        </div>
      </div>

      <p style={{ whiteSpace: "pre-wrap" }}>{localPost.content}</p>

      <div style={{ display: "flex", gap: 8 }}>
        <button
          onClick={toggleLike}
          style={{
            color: localPost.liked ? "red" : "black",
            border: "none",
            background: "transparent",
            cursor: "pointer",
            fontSize: 16
          }}
          aria-pressed={localPost.liked ? "true" : "false"}
        >
          {localPost.liked ? "♥️ Liked" : "♡ Like"}
        </button>

        <button
          onClick={() => {
            setShowComments(prev => !prev);
          }}
        >
          💬 {localPost.comments_count ?? 0} Comments
        </button>
      </div>

      {showComments && <CommentsSection post={localPost} user={user} authHeaders={authHeaders} />}
    </div>
  );
}
