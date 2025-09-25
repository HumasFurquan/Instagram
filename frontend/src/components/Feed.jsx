// src/components/Feed.jsx
import React, { useEffect, useState, useRef } from 'react';
import api from '../api';
import useSocket from '../hooks/useSocket';
import PostItem from './PostItem';

export default function Feed() {
  const [posts, setPosts] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [friendsList, setFriendsList] = useState([]); // track friends
  const [sentRequests, setSentRequests] = useState([]);
  const [loading, setLoading] = useState(false);

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
    onNewComment: ({ postId, comment }) => {
      setPosts(prev =>
        prev.map(p => {
          if (p.id !== postId) return p;
          const updatedComments = [comment, ...(p.comments || [])];
          return { ...p, comments: updatedComments, comments_count: (p.comments_count || 0) + 1 };
        })
      );
    },
    onPostViewed: ({ postId, views_count }) =>
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, views_count } : p)),
    onFriendAccepted: ({ userId }) => {
      setFriendsList(prev => [...prev, userId]);
    },
    onFriendRemoved: ({ userId: removedFriendId }) => {
      // remove friend from friendsList
      setFriendsList(prev => prev.filter(id => id !== removedFriendId));
    }
  });

  // ---------------- Load posts, friends & pending requests ----------------
  useEffect(() => {
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
    } finally {
      setLoading(false);
    }
  }

  async function loadSentRequests() {
    if (!user) return;
    try {
      const res = await api.get('/friends/sent', { headers: authHeaders() });
      const sentIds = res.data.map(r => r.id); // receivers of your requests
      setSentRequests(sentIds);
    } catch (err) {
      console.error('Failed to load sent requests', err);
    }
  }

  async function loadPendingFriendRequests() {
    if (!user) return;
    try {
      const res = await api.get('/friends/requests', { headers: authHeaders() });
      const pendingSenderIds = res.data.map(r => r.sender_id);
      setPendingRequests(pendingSenderIds);
    } catch (err) {
      console.error('Failed to load pending friend requests', err);
    }
  }

  async function loadFriendsList() {
    if (!user) return;
    try {
      const res = await api.get('/friends', { headers: authHeaders() });
      const friendIds = res.data.map(f => f.id);
      setFriendsList(friendIds);
    } catch (err) {
      console.error('Failed to load friends list', err);
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
      profile_picture_url: p.profile_picture_url || null,
      is_following_author: p.is_following_author ?? false
    };
  }

  // ---------------- IntersectionObserver ----------------
  function setupObserver() {
    observerRef.current?.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const postId = Number(entry.target.dataset.postId);
        if (!postId) return;
        if (entry.isIntersecting && !viewedRef.current.has(postId)) {
          viewedRef.current.add(postId);
          setPosts(prev => prev.map(p => p.id === postId ? { ...p, views_count: (p.views_count || 0) + 1 } : p));
          recordView(postId);
        }
      });
    }, { threshold: 0.5 });

    setTimeout(() => {
      document.querySelectorAll('[data-post-id]').forEach(el => observerRef.current.observe(el));
    }, 60);
  }

  async function recordView(postId) {
    if (!user || !token) return;
    try {
      await api.post(`/posts/${postId}/view`, {}, { headers: authHeaders() });
    } catch (err) {}
  }

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
          <PostItem
            post={p}
            user={user}
            authHeaders={authHeaders}
            toggleFollow={toggleFollow}
            pendingRequests={pendingRequests}
            friendsList={friendsList} // ✅ pass friends list to PostItem
            sentRequests={sentRequests}
            onSentRequest={(id) => setSentRequests(prev => [...prev, id])} // optional callback
            onUnfriend={(friendId) => {
              // 🔑 instantly update friends list when unfriended
              setFriendsList(prev => prev.filter(id => id !== friendId));
            }}
            onDelete={(postId) => {
              setPosts(prev => prev.filter(post => post.id !== postId));
            }}
          />
        </div>
      ))}
    </div>
  );
}
