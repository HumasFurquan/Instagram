// src/components/Feed.jsx
import React, { useEffect, useState, useRef } from 'react';
import api from '../api';
import useSocket from '../hooks/useSocket';

export default function Feed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCommentsFor, setShowCommentsFor] = useState({});
  const [commentInputs, setCommentInputs] = useState({});

  const viewedRef = useRef(new Set());
  const observerRef = useRef(null);

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  const authHeaders = () => (token ? { Authorization: `Bearer ${token}` } : {});

  // Socket handlers
  useSocket({
    onNewPost: (newPost) => setPosts(prev => [normalizePost(newPost), ...prev]),
    onPostLiked: ({ postId, likes_count, userId }) =>
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes_count } : p)),
    onPostUnliked: ({ postId, likes_count, userId }) =>
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, likes_count } : p)),
    onNewComment: ({ postId, comment }) => {
      // Prevent double-count for the origin client:
      if (user && comment.user_id === user.id) return;
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: [comment, ...(p.comments || [])], comments_count: (p.comments_count || 0) + 1 } : p));
    },
    onPostViewed: ({ postId, views_count }) =>
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, views_count } : p))
  });

  useEffect(() => {
    loadPosts();
    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
    // eslint-disable-next-line
  }, []);

  function normalizePost(p) {
    return {
      ...p,
      likes_count: p.likes_count ?? 0,
      views_count: p.views_count ?? 0,
      comments_count: p.comments_count ?? 0,
      liked: !!p.liked,
      comments: p.comments || []
    };
  }

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

  function setupObserver() {
    if (observerRef.current) observerRef.current.disconnect();
    observerRef.current = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        const postId = entry.target.dataset.postId;
        if (entry.isIntersecting && postId && !viewedRef.current.has(String(postId))) {
          viewedRef.current.add(String(postId));
          setPosts(prev => prev.map(p => String(p.id) === String(postId) ? { ...p, views_count: (p.views_count || 0) + 1 } : p));
          recordView(postId);
        }
      });
    }, { threshold: 0.5 });

    setTimeout(() => {
      document.querySelectorAll('[data-post-id]').forEach(el => observerRef.current.observe(el));
    }, 50);
  }

  async function recordView(postId) {
    if (!user || !token) return;
    try {
      const res = await api.post(`/posts/${postId}/view`, {}, { headers: authHeaders() });
      if (res?.data?.views_count !== undefined) {
        setPosts(prev => prev.map(p => p.id === Number(postId) ? { ...p, views_count: res.data.views_count } : p));
      }
    } catch (err) {
      // ignore silently
    }
  }

  // ---------- likes ----------
  async function toggleLike(postId) {
    if (!user || !token) return alert('Please login to like posts.');
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    const likedBefore = post.liked;

    // optimistic toggle for this client only
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, liked: !p.liked, likes_count: (p.likes_count || 0) + (p.liked ? -1 : 1) } : p));

    try {
      if (!likedBefore) {
        await api.post(`/posts/${postId}/like`, {}, { headers: authHeaders() });
      } else {
        // prefer DELETE
        try {
          await api.delete(`/posts/${postId}/like`, { headers: authHeaders() });
        } catch {
          await api.post(`/posts/${postId}/unlike`, {}, { headers: authHeaders() });
        }
      }
      // server will emit post_liked/post_unliked with updated likes_count
    } catch (err) {
      // revert
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, liked: likedBefore, likes_count: post.likes_count || 0 } : p));
      alert('Could not update like — please try again.');
    }
  }

  // ---------- comments ----------
  async function fetchComments(postId) {
    try {
      const res = await api.get(`/posts/${postId}/comments`, { headers: authHeaders() });
      const comments = res.data || [];
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments, comments_count: comments.length } : p));
    } catch (err) {
      console.error('Could not load comments', err);
    }
  }

  async function addComment(postId, text, clearInput) {
    if (!user || !token) return alert('Please login to comment.');
    if (!text || !text.trim()) return;

    const tempId = 't-' + Date.now();
    const tempComment = {
      id: tempId,
      user_id: user.id,
      post_id: postId,
      content: text,
      username: user.username || 'You',
      created_at: new Date().toISOString(),
      isTemp: true
    };

    // optimistic add
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: [tempComment, ...(p.comments || [])], comments_count: (p.comments_count || 0) + 1 } : p));
    clearInput();

    try {
      const res = await api.post(`/posts/${postId}/comment`, { content: text }, { headers: authHeaders() });
      const newComment = res.data;

      // replace temp with server comment (match by temp id)
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: p.comments.map(c => (c.id === tempId ? newComment : c)) } : p));
      // note: server emits new_comment to other clients; we ignore it on origin client in socket handler
    } catch (err) {
      // remove temp and decrement count
      setPosts(prev => prev.map(p => p.id === postId ? { ...p, comments: p.comments.filter(c => c.id !== tempId), comments_count: Math.max((p.comments_count || 1) - 1, 0) } : p));
      alert('Failed to add comment.');
    }
  }

  // UI helpers
  const onCommentChange = (postId, value) => setCommentInputs(prev => ({ ...prev, [postId]: value }));
  const clearCommentInput = (postId) => setCommentInputs(prev => ({ ...prev, [postId]: '' }));

  return (
    <div>
      <h2>Feed {loading ? '— loading...' : ''}</h2>
      {posts.map(p => (
        <div key={p.id} data-post-id={p.id} style={{ border: '1px solid #ddd', padding: 12, marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <b>{p.username}</b>
              <div style={{ color: '#666', fontSize: 12 }}>{new Date(p.created_at).toLocaleString()}</div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13 }}>{p.likes_count ?? 0} likes · {p.views_count ?? 0} views · {p.comments_count ?? 0} comments</div>
            </div>
          </div>

          <p style={{ whiteSpace: 'pre-wrap', marginTop: 8 }}>{p.content}</p>

          <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
            <button onClick={() => toggleLike(p.id)} style={{ color: p.liked ? 'red' : 'black', padding: '6px 10px', borderRadius: 6 }}>
              {p.liked ? '♥ Liked' : '♡ Like'}
            </button>

            <button onClick={() => { setShowCommentsFor(prev => ({ ...prev, [p.id]: !prev[p.id] })); if (!showCommentsFor[p.id]) fetchComments(p.id); }} style={{ padding: '6px 10px', borderRadius: 6 }}>
              💬 {p.comments_count ?? 0} Comments
            </button>
          </div>

          {showCommentsFor[p.id] && (
            <div style={{ marginTop: 10 }}>
              <div style={{ display: 'flex', gap: 8 }}>
                <input placeholder="Write a comment..." value={commentInputs[p.id] || ''} onChange={e => onCommentChange(p.id, e.target.value)} style={{ flex: 1, padding: 8 }} />
                <button onClick={() => addComment(p.id, commentInputs[p.id] || '', () => clearCommentInput(p.id))}>Post</button>
              </div>

              {(p.comments || []).length === 0 && <div style={{ color: '#666', marginTop: 8 }}>No comments yet</div>}
              {(p.comments || []).map(c => (
                <div key={c.id} style={{ borderTop: '1px solid #eee', paddingTop: 8, marginTop: 8 }}>
                  <b>{c.username}</b> <small style={{ color: '#666' }}>{new Date(c.created_at).toLocaleString()}</small>
                  <div style={{ marginTop: 6 }}>{c.content}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      ))}
      {posts.length === 0 && !loading && <div>No posts yet.</div>}
    </div>
  );
}
