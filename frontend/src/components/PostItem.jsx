// src/components/PostItem.jsx
import React, { useEffect, useState } from "react";
import api from "../api";
import CommentsSection from "./CommentsSection";
import { renderContentWithLinks } from "../utils/renderContent";
import FollowButton from "./FollowButton"; // 👈 import the follow button

export default function PostItem({ post, user, authHeaders, toggleFollow }) {
  const [localPost, setLocalPost] = useState(post);
  const [showComments, setShowComments] = useState(false);

  // Keep localPost synced with Feed updates
  useEffect(() => {
    setLocalPost(prev => ({
      ...prev,
      likes_count: post.likes_count ?? prev.likes_count ?? 0,
      views_count: post.views_count ?? prev.views_count ?? 0,
      comments_count: post.comments_count ?? prev.comments_count ?? 0,
      content: post.content,
      username: post.username,
      created_at: post.created_at,
      liked: typeof prev.liked !== "undefined" ? prev.liked : !!post.liked,
      is_following_author: post.is_following_author, // sync from Feed
      user_id: post.user_id,
    }));
  }, [
    post.id,
    post.likes_count,
    post.views_count,
    post.comments_count,
    post.content,
    post.is_following_author,
    post.username,
    post.created_at,
    post.user_id,
  ]);

  // Like toggle
  async function toggleLike() {
    if (!user) return alert("Please login to like posts.");
    const wasLiked = !!localPost.liked;

    setLocalPost(prev => ({
      ...prev,
      liked: !prev.liked,
      likes_count: (prev.likes_count ?? 0) + (prev.liked ? -1 : 1),
    }));

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
      setLocalPost(prev => ({ ...prev, liked: wasLiked }));
      console.error("Like error", err);
    }
  }

  return (
    <div style={{ border: "1px solid #ddd", padding: 8, marginBottom: 12 }}>
      {/* Header: username + follow button */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <b>{localPost.username}</b>
          {user && user.id !== localPost.user_id && (
            <FollowButton
              isFollowing={localPost.is_following_author}       // controlled state
              onToggle={() => toggleFollow(localPost.user_id)}  // callback from Feed.jsx
            />
          )}
          <small style={{ color: "#666" }}>
            {new Date(localPost.created_at).toLocaleString()}
          </small>
        </div>

        {/* Views & Comments count */}
        <div style={{ textAlign: "right", fontSize: 13, color: "#333" }}>
          {localPost.views_count ?? 0} views · {localPost.comments_count ?? 0} comments
        </div>
      </div>

      {/* Post content */}
      <p style={{ whiteSpace: "pre-wrap" }}>
        {renderContentWithLinks(localPost.content)}
      </p>

      {/* Actions: Like + Comment */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button
          onClick={toggleLike}
          style={{ color: localPost.liked ? "red" : "black" }}
        >
          {localPost.liked ? "♥️" : "♡"}{" "}
          <span style={{ marginLeft: 6 }}>{localPost.likes_count ?? 0}</span>
        </button>

        <button onClick={() => setShowComments(prev => !prev)}>
          💬 {localPost.comments_count ?? 0} Comments
        </button>
      </div>

      {/* Comments Section */}
      {showComments && (
        <CommentsSection postId={localPost.id} currentUser={user} />
      )}
    </div>
  );
}
