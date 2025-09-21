// src/components/PostItem.jsx
import React, { useEffect, useState } from "react";
import api from "../api";
import CommentsSection from "./CommentsSection";
import { renderContentWithLinks } from "../utils/renderContent";
import FollowButton from "./FollowButton";

export default function PostItem({ post, user, authHeaders, toggleFollow, onNewComment }) {
  const [localPost, setLocalPost] = useState(post);
  const [showComments, setShowComments] = useState(false);

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
      is_following_author: post.is_following_author,
      user_id: post.user_id,
      // always take latest comments from parent
      comments: post.comments ?? prev.comments ?? [],
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
    post.comments, // watch comments from parent
  ]);

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

  // Called when CommentsSection successfully adds a comment
  const handleCommentAdded = (newComment) => {
    setLocalPost(prev => ({
      ...prev,
      comments_count: (prev.comments_count ?? 0) + 1,
      comments: [newComment, ...(prev.comments || [])],
    }));
    if (onNewComment) {
      onNewComment(localPost.id, newComment); // update UserFeed state
    }
  };

  return (
    <div style={{ border: "1px solid #ddd", padding: 8, marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <b>{localPost.username}</b>
          {user && user.id !== localPost.user_id && (
            <FollowButton
              isFollowing={localPost.is_following_author}
              onToggle={() => {
                toggleFollow(localPost.user_id, localPost.is_following_author);
                setLocalPost(prev => ({
                  ...prev,
                  is_following_author: !prev.is_following_author
                }));
              }}
            />
          )}
          <small style={{ color: "#666" }}>
            {new Date(localPost.created_at).toLocaleString()}
          </small>
        </div>
        <div style={{ textAlign: "right", fontSize: 13, color: "#333" }}>
          {localPost.views_count ?? 0} views · {localPost.comments_count ?? 0} comments
        </div>
      </div>

      <p style={{ whiteSpace: "pre-wrap" }}>{renderContentWithLinks(localPost.content)}</p>

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

      {showComments && (
        <CommentsSection
          postId={localPost.id}
          currentUser={user}
          onCommentAdded={(postId, newComment) => {
            // update local post comments count and list
            setLocalPost(prev => ({
              ...prev,
              comments_count: (prev.comments_count || 0) + 1,
              comments: [newComment, ...(prev.comments || [])]
            }));
          }}
        />
      )}
    </div>
  );
}
