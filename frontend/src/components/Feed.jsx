// src/components/Feed.jsx
import React, { useEffect, useState, useRef } from 'react';
import api from '../api';

export default function Feed() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCommentsFor, setShowCommentsFor] = useState({});
  const viewedRef = useRef(new Set());
  const observerRef = useRef(null);

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  const authHeaders = () => (token ? { Authorization: `Bearer ${token}` } : {});

  useEffect(() => {
    loadPosts();
    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
    // eslint-disable-next-line
  }, []);

  // Fetch posts from backend
  async function loadPosts() {
    try {
      setLoading(true);
      const res = await api.get('/posts');
      let serverPosts = res.data || [];

      // ensure counts and comments exist
      serverPosts = serverPosts.map(p => ({
        ...p,
        likes_count: p.likes_count || 0,
        views_count: p.views_count || 0,
        comments_count: p.comments_count || 0,
        liked: !!p.liked,
        comments: p.comments || []
      }));

      setPosts(serverPosts);
      setupObserver();
    } catch (err) {
      console.error('Failed to load posts', err);
    } finally {
      setLoading(false);
    }
  }

  // IntersectionObserver for views
  function setupObserver() {
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          const el = entry.target;
          const postId = el.dataset.postId;
          if (entry.isIntersecting && postId && !viewedRef.current.has(postId)) {
            viewedRef.current.add(postId);
            recordView(postId);
            setPosts(prev =>
              prev.map(p => (String(p.id) === String(postId) ? { ...p, views_count: (p.views_count || 0) + 1 } : p))
            );
          }
        });
      },
      { threshold: 0.5 }
    );

    setTimeout(() => {
      document.querySelectorAll('[data-post-id]').forEach(el => observerRef.current.observe(el));
    }, 50);
  }

  async function recordView(postId) {
    try {
      await api.post(`/posts/${postId}/view`, {}, { headers: authHeaders() });
    } catch (err) {
      // silently ignore
    }
  }

  async function toggleLike(postId) {
    if (!user || !token) return alert('Please login to like posts.');
    const post = posts.find(p => p.id === postId);
    if (!post) return;

    setPosts(prev =>
      prev.map(p =>
        p.id === postId ? { ...p, liked: !p.liked, likes_count: (p.likes_count || 0) + (p.liked ? -1 : 1) } : p
      )
    );

    try {
      if (!post.liked) {
        await api.post(`/posts/${postId}/like`, {}, { headers: authHeaders() });
      } else {
        try {
          await api.delete(`/posts/${postId}/like`, { headers: authHeaders() });
        } catch {
          await api.post(`/posts/${postId}/unlike`, {}, { headers: authHeaders() });
        }
      }
    } catch (err) {
      setPosts(prev =>
        prev.map(p =>
          p.id === postId ? { ...p, liked: post.liked, likes_count: post.likes_count || 0 } : p
        )
      );
      alert('Could not update like — please try again.');
    }
  }

  async function fetchComments(postId) {
    try {
      const res = await api.get(`/posts/${postId}/comments`);
      const comments = res.data || [];
      setPosts(prev => prev.map(p => (p.id === postId ? { ...p, comments, comments_count: comments.length } : p)));
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
      content: text, // must match backend
      username: user.username || 'You',
      created_at: new Date().toISOString(),
      isTemp: true
    };

    setPosts(prev =>
      prev.map(p =>
        p.id === postId
          ? { ...p, comments: [tempComment, ...(p.comments || [])], comments_count: (p.comments_count || 0) + 1 }
          : p
      )
    );

    clearInput();

    try {
      const res = await api.post(
        `/posts/${postId}/comment`,
        { content: text },
        { headers: authHeaders() }
      );

      const newComment = res.data;

      setPosts(prev =>
        prev.map(p =>
          p.id === postId
            ? { ...p, comments: p.comments.map(c => (c.id === tempId ? newComment : c)) }
            : p
        )
      );
    } catch (err) {
      setPosts(prev =>
        prev.map(p =>
          p.id === postId
            ? {
                ...p,
                comments: p.comments.filter(c => c.id !== tempId),
                comments_count: Math.max((p.comments_count || 1) - 1, 0)
              }
            : p
        )
      );
      alert('Failed to add comment.');
    }
  }

  const [commentInputs, setCommentInputs] = useState({});
  const onCommentChange = (postId, value) => setCommentInputs(prev => ({ ...prev, [postId]: value }));

  return (
    <div>
      <h2>Feed {loading ? '— loading...' : ''}</h2>

      {posts.map(p => (
        <div
          key={p.id}
          data-post-id={p.id}
          style={{ border: '1px solid #ddd', padding: 8, marginBottom: 12 }}
          onClick={() => {
            if (!viewedRef.current.has(String(p.id))) {
              viewedRef.current.add(String(p.id));
              recordView(p.id);
              setPosts(prev => prev.map(x => (x.id === p.id ? { ...x, views_count: (x.views_count || 0) + 1 } : x)));
            }
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <b>{p.username}</b>{' '}
              <small style={{ color: '#666' }}>{new Date(p.created_at).toLocaleString()}</small>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, color: '#333' }}>
                {p.likes_count} likes · {p.views_count} views · {p.comments_count} comments
              </div>
            </div>
          </div>

          <p style={{ whiteSpace: 'pre-wrap' }}>{p.content}</p>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => toggleLike(p.id)}>{p.liked ? '♥️ Liked' : '♡ Like'}</button>
            <button
              onClick={() => {
                setShowCommentsFor(prev => ({ ...prev, [p.id]: !prev[p.id] }));
                if (!showCommentsFor[p.id]) fetchComments(p.id);
              }}
            >
              💬 {p.comments_count} Comments
            </button>
          </div>

          {showCommentsFor[p.id] && (
            <div style={{ marginTop: 8 }}>
              <div style={{ marginBottom: 8 }}>
                <input
                  placeholder="Write a comment..."
                  value={commentInputs[p.id] || ''}
                  onChange={e => onCommentChange(p.id, e.target.value)}
                  style={{ width: '70%', marginRight: 8 }}
                />
                <button
                  onClick={() =>
                    addComment(
                      p.id,
                      commentInputs[p.id] || '',
                      () => setCommentInputs(prev => ({ ...prev, [p.id]: '' }))
                    )
                  }
                >
                  Post
                </button>
              </div>

              {(p.comments || []).map(c => (
                <div key={c.id} style={{ borderTop: '1px solid #eee', paddingTop: 6, marginTop: 6 }}>
                  <b>{c.username}</b>{' '}
                  <small style={{ color: '#666' }}>{new Date(c.created_at).toLocaleString()}</small>
                  <div>{c.content}</div>
                </div>
              ))}

              {(p.comments || []).length === 0 && <div style={{ color: '#666' }}>No comments yet</div>}
            </div>
          )}
        </div>
      ))}

      {posts.length === 0 && !loading && <div>No posts yet.</div>}
    </div>
  );
}
