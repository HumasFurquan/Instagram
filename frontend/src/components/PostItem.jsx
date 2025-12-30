// src/components/PostItem.jsx
import React, { useEffect, useState } from "react";
import api from "../api";
import CommentsSection from "./CommentsSection";
import { renderContentWithLinks } from "../utils/renderContent";
import FollowButton from "./FollowButton";
import useSocket from "../hooks/useSocket";
import './PostItem.css';

export default function PostItem({ 
  post, 
  user, 
  authHeaders, 
  toggleFollow, 
  pendingRequests = [], 
  sentRequests = [],
  friendsList = [], 
  onNewComment,
  onUnfriend,
  onSentRequest,
  onDelete 
}) {
  const [localPost, setLocalPost] = useState(post);
  const [showComments, setShowComments] = useState(false);
  const [friendStatus, setFriendStatus] = useState("none"); 

  const socket = useSocket({
    onPostLiked: ({ postId, userId, likes_count }) => {
      if (postId === localPost.id) {
        setLocalPost(prev => ({
          ...prev,
          likes_count,
          liked: userId === user?.id ? true : prev.liked
        }));
      }
    },
    onPostUnliked: ({ postId, userId, likes_count }) => {
      if (postId === localPost.id) {
        setLocalPost(prev => ({
          ...prev,
          likes_count,
          liked: userId === user?.id ? false : prev.liked
        }));
      }
    },
    onNewComment: ({ postId, comment }) => {
      if (postId === localPost.id) {
        setLocalPost(prev => ({
          ...prev,
          comments: [comment, ...(prev.comments || [])],
          comments_count: (prev.comments_count || 0) + 1
        }));
        if (onNewComment) onNewComment(localPost.id, comment);
      }
    },
    onFollowUpdated: ({ userId, isFollowing }) => {
      if (userId === localPost.user_id) {
        setLocalPost(prev => ({ ...prev, is_following_author: isFollowing }));
      }
    },
    onUserFollowed: ({ userId }) => {
      if (userId === localPost.user_id) setFriendStatus("friends");
    },
    onUserUnfollowed: ({ userId }) => {
      if (userId === localPost.user_id && friendStatus === "friends") setFriendStatus("none");
    }
  });

  // Update friendStatus whenever friendsList or pendingRequests change
  useEffect(() => {
    if (friendsList.includes(post.user_id)) setFriendStatus("friends");
    else if (pendingRequests.includes(post.user_id)) setFriendStatus("pending"); // they sent request to you
    else if (sentRequests?.includes(post.user_id)) setFriendStatus("sent"); // you sent request to them
    else setFriendStatus("none");
  }, [post.user_id, pendingRequests, sentRequests, friendsList]);

  // ✅ listen for unfriend via socket safely
  useEffect(() => {
    if (!socket) return;  // 👈 prevent crash if socket is null

    const handleFriendRemoved = ({ userId: removedFriendId }) => {
      if (removedFriendId === post.user_id) {
        setFriendStatus("none");
        if (onUnfriend) onUnfriend(removedFriendId);
      }
    };

    socket.on("friendRemoved", handleFriendRemoved);
    return () => {
      socket.off("friendRemoved", handleFriendRemoved);
    };
  }, [post.user_id, socket, onUnfriend]);

  // Keep localPost in sync with parent post prop
  useEffect(() => {
    setLocalPost(prev => ({
      ...prev,
      ...post,
      likes_count: post.likes_count ?? prev.likes_count ?? 0,
      comments_count: post.comments_count ?? prev.comments_count ?? 0,
      views_count: post.views_count ?? prev.views_count ?? 0,
      liked: typeof post.liked !== "undefined" ? post.liked : prev.liked,
    }));
  }, [post]);

  // 🔥 LIKE ANIMATION RESET (PUT IT HERE)
  useEffect(() => {
    if (localPost.liked) {
      const timer = setTimeout(() => {
        const btn = document.querySelector(".like-btn.animate-like");
        btn?.classList.remove("animate-like");
      }, 400);

      return () => clearTimeout(timer);
    }
  }, [localPost.liked]);

  const toggleLike = async () => {
    if (!user) return alert("Please login to like posts.");
    const wasLiked = !!localPost.liked;

    setLocalPost(prev => ({
      ...prev,
      liked: !prev.liked,
      likes_count: (prev.likes_count ?? 0) + (prev.liked ? -1 : 1),
    }));

    try {
      if (!wasLiked) {
        await api.post(`/posts/${localPost.id}/like`, {}, { headers: authHeaders() });
        socket?.emit("likePost", { postId: localPost.id }); // 👈 safe emit
      } else {
        await api.delete(`/posts/${localPost.id}/like`, { headers: authHeaders() });
        socket?.emit("unlikePost", { postId: localPost.id }); // 👈 safe emit
      }
    } catch (err) {
      // rollback on error
      setLocalPost(prev => ({
        ...prev,
        liked: wasLiked,
        likes_count: prev.likes_count + (wasLiked ? 1 : -1),
      }));
      console.error("Like error", err);
    }
  };

  const handleCommentAdded = (newComment) => {
    setLocalPost(prev => ({
      ...prev,
      comments: [newComment, ...(prev.comments || [])],
      comments_count: (prev.comments_count || 0) + 1
    }));
    if (onNewComment) onNewComment(localPost.id, newComment);
  };

  const handleAddFriend = async () => {
    if (!user || friendStatus !== "none") return;

    const targetUserId = localPost.user_id;

    try {
      setFriendStatus("sent"); // show immediately
      if (onSentRequest) onSentRequest(targetUserId); // tell parent Feed to update sentRequests
      const res = await api.post(
        `/friends/request/${targetUserId}`,
        {},
        { headers: authHeaders() }
      );
      console.log("Friend request response:", res.data);
    } catch (err) {
      console.error("Full error response:", err.response?.data || err);
      setFriendStatus("none"); // rollback if API fails
      alert("Failed to send friend request. Check console for details.");
    }
  };

  return (
    <div className="post-card">
      <div className="post-header">
        <div className="post-user-info">
          <img className="post-avatar"
            src={localPost.profile_picture_url || "/default-avatar.png"}
            alt={localPost.username}
          />
          <b className="post-username">{localPost.username}</b>

          {user && user.id !== localPost.user_id && (
            <div className="post-actions">
              <FollowButton className="follow-btn"
                isFollowing={localPost.is_following_author}
                onToggle={() => {
                  toggleFollow(localPost.user_id, localPost.is_following_author);
                  setLocalPost(prev => ({ ...prev, is_following_author: !prev.is_following_author }));
                }}
              />
              <button className={`friend-btn friend-${friendStatus}`}
                onClick={handleAddFriend}
                // disabled={friendStatus !== "none"}
              >
                {friendStatus === "friends" 
                  ? "Friends" 
                  : friendStatus === "pending"
                  ? "Request Received"
                  : friendStatus === "sent"
                  ? "Request Sent" 
                  : "Add Friend"}
              </button>
            </div>
          )}

          <small className="post-timestamp">
            {new Date(localPost.created_at).toLocaleString()}
          </small>
        </div>

        <div className="post-meta">
          {localPost.views_count ?? 0} views · {localPost.comments_count ?? 0} comments

          {user && user.id === localPost.user_id && (
          <button className="delete-btn"
            onClick={async () => {
              if (!window.confirm("Are you sure you want to delete this post?")) return;
              try {
                await api.delete(`/posts/${localPost.id}`, { headers: authHeaders() });
                if (typeof onDelete === "function") {
                  onDelete(localPost.id); // notify parent Feed
                }
              } catch (err) {
                console.error("Delete failed:", err.response?.data || err);
                alert("Failed to delete post. Try again.");
              }
            }}
          >
            🗑️ Delete
          </button>
        )}
        </div>
      </div>

      <p>
        {renderContentWithLinks(localPost.content)}
      </p>

      {localPost.image_url && (
        <div className="post-image-wrapper">
          <img className="post-image"
            src={localPost.image_url}
            alt="Post"
          />
        </div>
      )}

      <div className="post-footer">
      <button
        className={`like-btn ${localPost.liked ? "liked animate-like" : ""}`}
        onClick={toggleLike}
      >
        <span className="heart-icon">
          {localPost.liked ? "❤️" : "🤍"}
        </span>
        <span className="like-count">
          {localPost.likes_count ?? 0}
        </span>
      </button>

        <button className="comment-btn" onClick={() => setShowComments(prev => !prev)}>
          💬 {localPost.comments_count ?? 0} Comments
        </button>
      </div>

      {showComments && (
        <CommentsSection
          postId={localPost.id}
          currentUser={user}
          onCommentAdded={handleCommentAdded}
        />
      )}
    </div>
  );
}
