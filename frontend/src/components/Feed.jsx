// src/components/Feed.jsx
import React, { useEffect, useState, useRef } from 'react';
import api from '../api';
import useSocket from '../hooks/useSocket';
import PostItem from './PostItem'; // ✅ import PostItem

export default function Feed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const authHeaders = () => (token ? { Authorization: `Bearer ${token}` } : {});

  const viewedRef = useRef(new Set());
  const viewStartMap = useRef(new Map());
  const observerRef = useRef(null);

  // ---------------- Socket handlers ----------------
  useSocket({
    onNewPost: (newPost) => setPosts(prev => [normalizePost(newPost), ...prev]),

    onPostLiked: ({ postId, likes_count }) =>
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes_count } : p)),

    onPostUnliked: ({ postId, likes_count }) =>
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes_count } : p)),

    onNewComment: ({ postId, comment }) => {
      setPosts(prev => prev.map(p => {
        if (p.id !== postId) return p;

        // prepend new comment to the existing array
        const updatedComments = [comment, ...(p.comments || [])];

        return {
          ...p,
          comments: updatedComments,
          comments_count: (p.comments_count || 0) + 1  // increment by 1
        };
      }));
    },

    onPostViewed: ({ postId, views_count }) =>
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, views_count } : p))
  });

  // ---------------- Load posts ----------------
  useEffect(() => {
    loadPosts();
    return () => {
      if (observerRef.current) observerRef.current.disconnect();
      flushAllOngoingViews();
    };
  }, []);

  async function loadPosts() {
    try {
      setLoading(true);
      const res = await api.get('/posts', { headers: authHeaders() });
      const serverPosts = (res.data || []).map(normalizePost);
      setPosts(serverPosts);
      setupObserver();
    } catch (err) {
      console.error('Failed to load posts', err);
    } finally {
      setLoading(false);
    }
  }

  function normalizePost(p) {
    return {
      ...p,
      likes_count: p.likes_count ?? 0,
      views_count: p.views_count ?? 0,
      comments_count: p.comments_count ?? 0,
      liked: !!p.liked,
      comments: p.comments || [],
      user_id: p.user_id,
      is_following_author: p.is_following_author ?? false
    };
  }

  // ---------------- IntersectionObserver ----------------
  function setupObserver() {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const postId = entry.target.dataset.postId;
        if (!postId) return;
        if (entry.isIntersecting && !viewedRef.current.has(postId)) {
          viewedRef.current.add(postId);
          setPosts(prev => prev.map(p => p.id === Number(postId) ? { ...p, views_count: (p.views_count || 0) + 1 } : p));
          recordView(postId);
        }
      });
    }, { threshold: 0.5 });

    setTimeout(() => {
      document.querySelectorAll('[data-post-id]').forEach(el => observerRef.current.observe(el));
    }, 60);
  }

  function flushAllOngoingViews() {
    for (const [postId, startTs] of viewStartMap.current.entries()) {
      const durationSec = (Date.now() - startTs) / 1000;
      if (durationSec > 0) sendEvent('view', postId, { duration: durationSec }).catch(() => {});
    }
    viewStartMap.current.clear();
  }

  async function recordView(postId) {
    if (!user || !token) return;
    try {
      await api.post(`/posts/${postId}/view`, {}, { headers: authHeaders() });
    } catch (err) { }
  }

  async function sendEvent(eventType, postId, value = {}) {
    if (!user || !token) return;
    try {
      await api.post('/events', { postId, event_type: eventType, value }, { headers: authHeaders() });
    } catch (err) {
      console.error('Failed to send event', eventType, postId, err);
    }
  }

    async function toggleFollow(targetUserId) {
    if (!user || !token) return alert('Please login to follow users.');

    // find current following state from first post of the user
    const isCurrentlyFollowing = posts.find(p => p.user_id === targetUserId)?.is_following_author;

    // optimistic update: update all posts from that user
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
      // rollback in case of error
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
      <h2>Feed {loading ? '— loading...' : ''}</h2>
      {posts.length === 0 && !loading && <div>No posts yet.</div>}
      {posts.map(p => (
        <div key={p.id} data-post-id={p.id}>
          <PostItem post={p} user={user} authHeaders={authHeaders} toggleFollow={toggleFollow} />
        </div>
      ))}
    </div>
  );
}
