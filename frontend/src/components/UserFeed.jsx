// src/components/UserFeed.jsx
import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import api from '../api';
import PostItem from './PostItem';
import useSocket from '../hooks/useSocket';

export default function UserFeed({ user, authHeaders }) {
  const { userId } = useParams();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);

  // 🔴 socket handlers
  useSocket({
    onPostLiked: ({ postId, likes_count }) => {
      setPosts(prev =>
        prev.map(p => (p.id === postId ? { ...p, likes_count } : p))
      );
    },
    onPostUnliked: ({ postId, likes_count }) => {
      setPosts(prev =>
        prev.map(p => (p.id === postId ? { ...p, likes_count } : p))
      );
    },
    onNewComment: ({ postId, comment }) => {
      setPosts(prev =>
        prev.map(p =>
          p.id === postId
            ? {
                ...p,
                comments: [comment, ...(p.comments || [])],
                comments_count: (p.comments_count || 0) + 1,
              }
            : p
        )
      );
    },
    onNewPost: (newPost) => {
      if (Number(newPost.user_id) === Number(userId)) {
        setPosts(prev => [normalizePost(newPost), ...prev]);
      }
    },
    onPostViewed: ({ postId, views_count }) => {
      setPosts(prev =>
        prev.map(p => (p.id === postId ? { ...p, views_count } : p))
      );
    },

    // ✅ follow/unfollow handlers (only for current logged-in user)
    onUserFollowed: ({ followerId, followeeId }) => {
      if (Number(followerId) !== Number(user.id)) return; // ignore events from other users
      setPosts(prev =>
        prev.map(p =>
          p.user_id === followeeId
            ? { ...p, is_following_author: true }
            : p
        )
      );
    },
    onUserUnfollowed: ({ followerId, followeeId }) => {
      if (Number(followerId) !== Number(user.id)) return; // ignore events from other users
      setPosts(prev =>
        prev.map(p =>
          p.user_id === followeeId
            ? { ...p, is_following_author: false }
            : p
        )
      );
    },
  });

  // ---------------- Load posts ----------------
  useEffect(() => {
    async function fetchPosts() {
      try {
        const res = await api.get(`/users/${userId}/posts`, {
          headers: authHeaders(),
        });
        const serverPosts = (res.data || []).map(normalizePost);
        setPosts(serverPosts);
      } catch (err) {
        console.error('Failed to fetch user posts', err);
      } finally {
        setLoading(false);
      }
    }
    fetchPosts();
  }, [userId, authHeaders]);

  // ---------------- Normalize post ----------------
  function normalizePost(p) {
    return {
      ...p,
      likes_count: p.likes_count ?? 0,
      views_count: p.views_count ?? 0,
      comments_count: p.comments_count ?? 0,
      liked: !!p.liked,
      comments: p.comments || [],
      user_id: p.user_id,
      is_following_author: p.is_following_author ?? false,
    };
  }

  // ---------------- Follow toggle ----------------
  async function toggleFollow(targetUserId) {
    if (!user) return alert('Please login to follow users.');

    if (!targetUserId || isNaN(targetUserId)) {
      console.error('Invalid targetUserId for follow:', targetUserId);
      return;
    }

    const isCurrentlyFollowing = posts.find(p => p.user_id === targetUserId)?.is_following_author;

    // optimistic update
    setPosts(prev =>
      prev.map(p =>
        p.user_id === targetUserId
          ? { ...p, is_following_author: !isCurrentlyFollowing }
          : p
      )
    );

    try {
      if (!isCurrentlyFollowing) {
        await api.post(`/follows/${targetUserId}`, {}, { headers: authHeaders() });
      } else {
        await api.delete(`/follows/${targetUserId}`, { headers: authHeaders() });
      }
    } catch (err) {
      // rollback
      setPosts(prev =>
        prev.map(p =>
          p.user_id === targetUserId
            ? { ...p, is_following_author: isCurrentlyFollowing }
            : p
        )
      );
      alert('Could not update follow status. Please try again.');
    }
  }

  // ---------------- Render ----------------
  return (
    <div>
      <h2>User Posts {loading && '— loading...'}</h2>
      {!loading && posts.length === 0 && <div>No posts yet.</div>}
      {posts.map(p => (
        <PostItem
          key={p.id}
          post={p}
          user={user}
          authHeaders={authHeaders}
          toggleFollow={toggleFollow}
        />
      ))}
    </div>
  );
}
