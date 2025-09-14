import React, { useState, useEffect } from "react";
import api from "../api";
import CommentsSection from "./CommentsSection";

export default function PostItem({ post, user, authHeaders, socket }) {
  const [showComments, setShowComments] = useState(false);
  const [localPost, setLocalPost] = useState(post);

  /** ------------------ Likes ------------------ **/
  async function toggleLike() {
    if (!user) return alert("Please login to like posts.");
    const likedBefore = localPost.liked;

    setLocalPost(prev => ({
      ...prev,
      liked: !prev.liked,
      likes_count: prev.likes_count + (prev.liked ? -1 : 1)
    }));

    try {
      if (!likedBefore) {
        await api.post(`/posts/${localPost.id}/like`, {}, { headers: authHeaders() });
      } else {
        try {
          await api.delete(`/posts/${localPost.id}/like`, { headers: authHeaders() });
        } catch {
          await api.post(`/posts/${localPost.id}/unlike`, {}, { headers: authHeaders() });
        }
      }
    } catch (err) {
      setLocalPost(prev => ({ ...prev, liked: likedBefore, likes_count: post.likes_count }));
      alert("Failed to update like.");
    }
  }

  /** ------------------ Socket.IO Updates ------------------ **/
  useEffect(() => {
    if (!socket) return;

    const handleViewed = ({ postId, views_count }) => {
      if (postId === localPost.id) {
        setLocalPost(prev => ({ ...prev, views_count }));
      }
    };

    const handleLiked = ({ postId, likes_count, userId }) => {
      if (postId === localPost.id) {
        const liked = user?.id === userId ? true : localPost.liked;
        setLocalPost(prev => ({ ...prev, likes_count, liked }));
      }
    };

    const handleUnliked = ({ postId, likes_count, userId }) => {
      if (postId === localPost.id) {
        const liked = user?.id === userId ? false : localPost.liked;
        setLocalPost(prev => ({ ...prev, likes_count, liked }));
      }
    };

    const handleNewComment = ({ postId, comment }) => {
      if (postId === localPost.id) {
        setLocalPost(prev => ({
          ...prev,
          comments: [comment, ...(prev.comments || [])],
          comments_count: (prev.comments_count || 0) + 1
        }));
      }
    };

    socket.on("post_viewed", handleViewed);
    socket.on("post_liked", handleLiked);
    socket.on("post_unliked", handleUnliked);
    socket.on("new_comment", handleNewComment);

    return () => {
      socket.off("post_viewed", handleViewed);
      socket.off("post_liked", handleLiked);
      socket.off("post_unliked", handleUnliked);
      socket.off("new_comment", handleNewComment);
    };
  }, [socket, localPost, user]);

  return (
    <div style={{ border: "1px solid #ddd", padding: 8, marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between" }}>
        <div>
          <b>{localPost.username}</b>{" "}
          <small style={{ color: "#666" }}>{new Date(localPost.created_at).toLocaleString()}</small>
        </div>
        <div style={{ textAlign: "right" }}>
          <div style={{ fontSize: 13, color: "#333" }}>
            {localPost.likes_count} likes · {localPost.views_count} views · {localPost.comments_count} comments
          </div>
        </div>
      </div>

      <p style={{ whiteSpace: "pre-wrap" }}>{localPost.content}</p>

      <div style={{ display: "flex", gap: 8 }}>
        <button onClick={toggleLike} style={{ color: localPost.liked ? "red" : "black" }}>
          {localPost.liked ? "♥️ Liked" : "♡ Like"}
        </button>
        <button onClick={() => setShowComments(prev => !prev)}>
          💬 {localPost.comments_count} Comments
        </button>
      </div>

      {showComments && (
        <CommentsSection post={localPost} user={user} authHeaders={authHeaders} socket={socket} />
      )}
    </div>
  );
}
