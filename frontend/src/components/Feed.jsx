// src/components/Feed.jsx
import React, { useEffect, useState, useRef } from 'react';
import api from '../api';

/*
 Assumptions:
 - If user is logged-in, token and user are stored in localStorage:
   localStorage.token  (string JWT)
   localStorage.user   (JSON string { id, username, ... })
 - Backend endpoints used (all relative to api.baseURL):
   GET  /posts                        -> returns basic posts array (id, user_id, username, content, created_at)
   GET  /posts/:id/likes              -> { likeCount: number }  OR array of likes
   GET  /posts/:id/views              -> { viewCount: number }
   GET  /posts/:id/comments           -> array of comments (id, text, username, created_at)
   POST /posts/:id/like               -> like post (requires auth)
   DELETE /posts/:id/like             -> unlike post (requires auth) - optional, backend might implement POST /posts/:id/unlike
   POST /posts/:id/view               -> record a view (requires auth or accept anonymous)
   POST /posts/:id/comment            -> { text } (requires auth)
 - The component will try to use aggregated counts if the GET /posts already returns likes_count, views_count, comments_count.
*/

export default function Feed() {
  const [posts, setPosts] = useState([]); // posts with enriched metadata
  const [loading, setLoading] = useState(false);
  const [showCommentsFor, setShowCommentsFor] = useState({}); // postId -> boolean
  const viewedRef = useRef(new Set()); // locally track which posts we've already reported view for
  const observerRef = useRef(null);

  const token = localStorage.getItem('token');
  const user = JSON.parse(localStorage.getItem('user') || 'null');

  const authHeaders = () => (token ? { Authorization: `Bearer ${token}` } : {});

  useEffect(() => {
    loadPosts();
    // cleanup observer on unmount
    return () => {
      if (observerRef.current) observerRef.current.disconnect();
    };
    // eslint-disable-next-line
  }, []);

  // --- Fetch posts then enrich with counts if needed ---
  async function loadPosts() {
    try {
      setLoading(true);
      const res = await api.get('/posts'); // expects array of posts
      let serverPosts = res.data || [];

      // If server already provides aggregated counts (faster) use that
      if (serverPosts.length && serverPosts[0].likes_count !== undefined) {
        // ensure local fields exist
        serverPosts = serverPosts.map(p => ({
          ...p,
          likes_count: p.likes_count || 0,
          views_count: p.views_count || 0,
          comments_count: p.comments_count || 0,
          liked: !!p.liked,      // backend may provide boolean `liked` for current user
          comments: p.comments || []
        }));
        setPosts(serverPosts);
        setupObserver();
        setLoading(false);
        return;
      }

      // Fallback: enrich per-post (parallel requests). This is fine for small number of posts.
      const enriched = await Promise.all(
        serverPosts.map(async p => {
          try {
            // fire in parallel
            const [likesRes, viewsRes, commentsRes] = await Promise.all([
              api.get(`/posts/${p.id}/likes`).catch(() => ({ data: null })),
              api.get(`/posts/${p.id}/views`).catch(() => ({ data: null })),
              api.get(`/posts/${p.id}/comments`).catch(() => ({ data: [] }))
            ]);

            // normalize responses (different backends can return different shapes)
            const likeCount =
              likesRes?.data?.likeCount ??
              (Array.isArray(likesRes?.data) ? likesRes.data.length : 0);
            const viewCount = viewsRes?.data?.viewCount ?? 0;
            const comments = commentsRes?.data ?? [];
            // optional: likes endpoint might include whether current user liked, e.g. { liked: true }
            const liked = !!likesRes?.data?.liked;

            return {
              ...p,
              likes_count: likeCount,
              views_count: viewCount,
              comments_count: Array.isArray(comments) ? comments.length : (comments.count ?? 0),
              comments: Array.isArray(comments) ? comments : [],
              liked
            };
          } catch (err) {
            // fallback minimal data
            return { ...p, likes_count: 0, views_count: 0, comments_count: 0, comments: [], liked: false };
          }
        })
      );

      setPosts(enriched);
      setupObserver();
    } catch (err) {
      console.error('Failed to load posts', err);
    } finally {
      setLoading(false);
    }
  }

  // --- IntersectionObserver to record views only once when a post becomes visible ---
  function setupObserver() {
    // disconnect old
    if (observerRef.current) observerRef.current.disconnect();

    observerRef.current = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          const el = entry.target;
          const postId = el.dataset.postId;
          if (entry.isIntersecting && postId && !viewedRef.current.has(postId)) {
            // mark viewed in local set then call server
            viewedRef.current.add(postId);
            recordView(postId);
            // optionally update UI immediately
            setPosts(prev => prev.map(p => (String(p.id) === String(postId) ? { ...p, views_count: (p.views_count || 0) + 1 } : p)));
          }
        });
      },
      { threshold: 0.5 } // when 50% visible
    );

    // attach to elements after small timeout to ensure DOM exists
    setTimeout(() => {
      document.querySelectorAll('[data-post-id]').forEach(el => observerRef.current.observe(el));
    }, 50);
  }

  // --- API actions ---
  async function recordView(postId) {
    try {
      // server should ignore duplicate user+post combos via unique constraint (server side).
      await api.post(`/posts/${postId}/view`, {}, { headers: authHeaders() });
    } catch (err) {
      // non-fatal: view recording can fail silently
      // console.error('view record failed', err);
    }
  }

  async function toggleLike(postId) {
    if (!user || !token) return alert('Please login to like posts.');

    const post = posts.find(p => p.id === postId);
    if (!post) return;

    // optimistic UI update
    setPosts(prev =>
      prev.map(p =>
        p.id === postId ? { ...p, liked: !p.liked, likes_count: (p.likes_count || 0) + (p.liked ? -1 : 1) } : p
      )
    );

    try {
      if (!post.liked) {
        // like
        await api.post(`/posts/${postId}/like`, {}, { headers: authHeaders() });
      } else {
        // unlike - backend should implement DELETE /posts/:id/like OR POST /posts/:id/unlike
        // we'll try DELETE first, fallback to POST /posts/:id/unlike
        try {
          await api.delete(`/posts/${postId}/like`, { headers: authHeaders() });
        } catch (e) {
          await api.post(`/posts/${postId}/unlike`, {}, { headers: authHeaders() });
        }
      }
    } catch (err) {
      // revert optimistic update on error
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

    // optimistic add
    const tempId = 't-' + Date.now();
    const tempComment = {
      id: tempId,
      text,
      username: user.username || 'You',
      created_at: new Date().toISOString(),
      isTemp: true
    };
    setPosts(prev => prev.map(p => (p.id === postId ? { ...p, comments: [tempComment, ...(p.comments || [])], comments_count: (p.comments_count || 0) + 1 } : p)));

    clearInput();

    try {
      const res = await api.post(`/posts/${postId}/comment`, { text }, { headers: authHeaders() });
      // server returns created comment (ideally), otherwise reload comments
      if (res?.data?.id) {
        // replace temp comment
        setPosts(prev =>
          prev.map(p =>
            p.id === postId
              ? {
                  ...p,
                  comments: p.comments.map(c => (c.id === tempId ? res.data : c))
                }
              : p
          )
        );
      } else {
        // if server didn't return comment, fetch comments afresh
        fetchComments(postId);
      }
    } catch (err) {
      // remove temp comment and decrement count
      setPosts(prev =>
        prev.map(p =>
          p.id === postId
            ? { ...p, comments: p.comments.filter(c => c.id !== tempId), comments_count: Math.max((p.comments_count || 1) - 1, 0) }
            : p
        )
      );
      alert('Failed to add comment.');
    }
  }

  // --- UI helpers ---
  const [commentInputs, setCommentInputs] = useState({}); // { postId: currentText }
  const onCommentChange = (postId, value) => setCommentInputs(prev => ({ ...prev, [postId]: value }));

  return (
    <div>
      <h2>Feed {loading ? '— loading...' : ''}</h2>

      {posts.map(p => (
        <div
          key={p.id}
          data-post-id={p.id}
          style={{ border: '1px solid #ddd', padding: 8, marginBottom: 12 }}
          // clicking the post will record a view as fallback (observer is preferred)
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
                {p.likes_count ?? 0} likes · {p.views_count ?? 0} views · {p.comments_count ?? 0} comments
              </div>
            </div>
          </div>

          <p style={{ whiteSpace: 'pre-wrap' }}>{p.content}</p>

          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={() => toggleLike(p.id)}>{p.liked ? '♥️ Liked' : '♡ Like'}</button>
            <button
              onClick={() => {
                setShowCommentsFor(prev => ({ ...prev, [p.id]: !prev[p.id] }));
                // if opening comments, load them
                if (!showCommentsFor[p.id]) fetchComments(p.id);
              }}
            >
              💬 {p.comments_count ?? 0} Comments
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
                  <b>{c.username}</b> <small style={{ color: '#666' }}>{new Date(c.created_at).toLocaleString()}</small>
                  <div>{c.text}</div>
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
