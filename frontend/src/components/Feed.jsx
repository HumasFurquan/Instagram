// src/components/Feed.jsx
import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api';
import useSocket from '../hooks/useSocket';
import PostItem from './PostItem';
import './Feed.css';

export default function Feed() {
  const navigate = useNavigate();
  const [posts, setPosts] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [friendsList, setFriendsList] = useState([]);
  const [sentRequests, setSentRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [activeChatFriend, setActiveChatFriend] = useState(null);

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');
  const authHeaders = () => (token ? { Authorization: `Bearer ${token}` } : {});

  const viewedRef = useRef(new Set());
  const observerRef = useRef(null);

  // ---------------- Socket handlers ----------------
  const socket = useSocket({
    onNewPost: (newPost) => {
      const normalized = normalizePost(newPost);
      normalized.is_following_author = friendsList.includes(normalized.user_id);
      setPosts(prev => [normalized, ...prev]);
    },
    onPostLiked: ({ postId, likes_count, userId: actorId }) =>
      setPosts(prev =>
        prev.map(p =>
          p.id === postId
            ? { ...p, likes_count, liked: actorId === user?.id ? true : p.liked }
            : p
        )
      ),
    onPostUnliked: ({ postId, likes_count, userId: actorId }) =>
      setPosts(prev =>
        prev.map(p =>
          p.id === postId
            ? { ...p, likes_count, liked: actorId === user?.id ? false : p.liked }
            : p
        )
      ),
    onNewComment: ({ postId, comment }) =>
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
      ),
    onPostViewed: ({ postId, views_count }) =>
      setPosts(prev => prev.map(p => (p.id === postId ? { ...p, views_count } : p))),
    onFriendAccepted: ({ userId }) => setFriendsList(prev => [...prev, userId]),
    onFriendRemoved: ({ userId: removedFriendId }) =>
      setFriendsList(prev => prev.filter(id => id !== removedFriendId)),
  });

  // ---------------- Redirect if no token ----------------
  useEffect(() => {
    if (!token) {
      navigate('/login', { replace: true });
    }
  }, [token, navigate]);

  // ---------------- Load posts, friends & requests ----------------
  useEffect(() => {
    if (!token) return;
    loadPosts();
    loadPendingFriendRequests();
    loadFriendsList();
    loadSentRequests();

    return () => observerRef.current?.disconnect();
  }, []);

  async function loadPosts() {
    try {
      setLoading(true);
      const res = await api.get('/posts', { headers: authHeaders() });
      setPosts((res.data || []).map(normalizePost));
      setupObserver();
    } catch (err) {
      console.error('Failed to load posts', err);
      if (err.response?.status === 401) handleUnauthorized();
    } finally {
      setLoading(false);
    }
  }

  async function loadSentRequests() {
    if (!user) return;
    try {
      const res = await api.get('/friends/sent', { headers: authHeaders() });
      setSentRequests(res.data.map(r => r.id));
    } catch (err) {
      console.error('Failed to load sent requests', err);
      if (err.response?.status === 401) handleUnauthorized();
    }
  }

  async function loadPendingFriendRequests() {
    if (!user) return;
    try {
      const res = await api.get('/friends/requests', { headers: authHeaders() });
      setPendingRequests(res.data.map(r => r.sender_id));
    } catch (err) {
      console.error('Failed to load pending friend requests', err);
      if (err.response?.status === 401) handleUnauthorized();
    }
  }

  async function loadFriendsList() {
    if (!user) return;
    try {
      const res = await api.get('/friends', { headers: authHeaders() });
      setFriendsList(res.data.map(f => f.id));
    } catch (err) {
      console.error('Failed to load friends list', err);
      if (err.response?.status === 401) handleUnauthorized();
    }
  }

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
      profile_picture_url: p.profile_picture_url || null,
      is_following_author: p.is_following_author ?? false,
    };
  }

  // ---------------- Intersection Observer ----------------
  function setupObserver() {
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const postId = Number(entry.target.dataset.postId);
        if (!postId) return;
        if (entry.isIntersecting && !viewedRef.current.has(postId)) {
          viewedRef.current.add(postId);
          setPosts(prev =>
            prev.map(p =>
              p.id === postId ? { ...p, views_count: (p.views_count || 0) + 1 } : p
            )
          );
          recordView(postId);
        }
      });
    }, { threshold: 0.5 });

    setTimeout(() => {
      document
        .querySelectorAll('[data-post-id]')
        .forEach(el => observerRef.current.observe(el));
    }, 60);
  }

  async function recordView(postId) {
    if (!user || !token) return;
    try {
      await api.post(`/posts/${postId}/view`, {}, { headers: authHeaders() });
    } catch {}
  }

  // ---------------- Follow toggle ----------------
  async function toggleFollow(targetUserId) {
    if (!user || !token) return alert('Please login to follow users.');
    const isCurrentlyFollowing = posts.find(p => p.user_id === targetUserId)?.is_following_author;

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
      setPosts(prev =>
        prev.map(p =>
          p.user_id === targetUserId
            ? { ...p, is_following_author: isCurrentlyFollowing }
            : p
        )
      );
      if (err.response?.status === 401) handleUnauthorized();
      else alert('Could not update follow status. Please try again.');
    }
  }

  // ---------------- Logout helper ----------------
  function handleUnauthorized() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/login', { replace: true });
  }

  // ---------------- Render ---------------- 
  return (
    <div className="feed-container">
      <div className="feed-header">
        <h2 className="feed-title">Feed</h2>
        {loading && <span className="feed-loading">Loading...</span>}
      </div>
      {posts.length === 0 && !loading && (
        <div className="feed-empty-state">No posts yet. Start following users to see their posts!</div>
      )}
      <div className="feed-posts-list">
        {posts.map(p => (
          <div key={p.id} className="feed-post-wrapper" data-post-id={p.id}>
            <PostItem
              post={p}
              user={user}
              authHeaders={authHeaders}
              toggleFollow={toggleFollow}
              pendingRequests={pendingRequests}
              friendsList={friendsList}
              sentRequests={sentRequests}
              onSentRequest={(id) => setSentRequests(prev => [...prev, id])}
              onUnfriend={(friendId) =>
                setFriendsList(prev => prev.filter(id => id !== friendId))
              }
              onDelete={(postId) =>
                setPosts(prev => prev.filter(post => post.id !== postId))
              }
            />
          </div>
        ))}
      </div>
    </div>
  );
}
