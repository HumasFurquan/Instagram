// src/components/PostItem.jsx
import React, { useEffect, useState } from "react";
import api from "../api";
import CommentsSection from "./CommentsSection";

export default function PostItem({ post, user, authHeaders }) {
  const [localPost, setLocalPost] = useState(post);
  const [showComments, setShowComments] = useState(false);

  useEffect(() => {
    // Keep counts & content in sync with server updates but preserve local liked if user recently changed it
    setLocalPost(prev => ({
      ...prev,
      likes_count: post.likes_count ?? prev.likes_count ?? 0,
      views_count: post.views_count ?? prev.views_count ?? 0,
      comments_count: post.comments_count ?? prev.comments_count ?? 0,
      content: post.content,
      username: post.username,
      created_at: post.created_at,
      liked: typeof prev.liked !== 'undefined' ? prev.liked : !!post.liked
    }));
    // eslint-disable-next-line
  }, [post.id, post.likes_count, post.views_count, post.comments_count, post.content]);

  async function toggleLike() {
    if (!user) return alert('Please login to like posts.');
    const wasLiked = !!localPost.liked;

    // optimistic update (local only)
    setLocalPost(prev => ({ ...prev, liked: !prev.liked, likes_count: (prev.likes_count ?? 0) + (prev.liked ? -1 : 1) }));

    try {
      if (!wasLiked) {
        const res = await api.post(`/posts/${localPost.id}/like`, {}, { headers: authHeaders() });
        if (res?.data?.likes_count !== undefined) {
          setLocalPost(prev => ({ ...prev, likes_count: res.data.likes_count }));
        }
      } else {
        const res = await api.delete(`/posts/${localPost.id}/like`, { headers: authHeaders() });
        if (res?.data?.likes_count !== undefined) {
          setLocalPost(prev => ({ ...prev, likes_count: res.data.likes_count }));
        }
      }
    } catch (err) {
      // revert
      setLocalPost(prev => ({ ...prev, liked: wasLiked }));
      console.error('Like error', err);
    }
  }

  return (
    <div style={{ border: "1px solid #ddd", padding: 8, marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <b>{localPost.username}</b>{" "}
          <small style={{ color: "#666" }}>{new Date(localPost.created_at).toLocaleString()}</small>
        </div>
        <div style={{ textAlign: "right", fontSize: 13, color: "#333" }}>
          {localPost.views_count ?? 0} views · {localPost.comments_count ?? 0} comments
        </div>
      </div>

      <p style={{ whiteSpace: "pre-wrap" }}>{localPost.content}</p>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button onClick={toggleLike} style={{ color: localPost.liked ? "red" : "black" }}>
          {localPost.liked ? "♥️" : "♡"} <span style={{ marginLeft: 6 }}>{localPost.likes_count ?? 0}</span>
        </button>

        <button onClick={() => setShowComments(prev => !prev)}>
          💬 {localPost.comments_count ?? 0} Comments
        </button>
      </div>

      {showComments && <CommentsSection postId={localPost.id} currentUser={user} />}
    </div>
  );
}
