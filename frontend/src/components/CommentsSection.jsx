// src/components/CommentsSection.jsx
import React, { useEffect, useState } from "react";
import api from "../api";

export default function CommentsSection({ postId, currentUser }) {
  const [comments, setComments] = useState([]);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchComments();
    // eslint-disable-next-line
  }, [postId]);

  async function fetchComments() {
    try {
      setLoading(true);
      const res = await api.get(`/posts/${postId}/comments`);
      setComments(res.data || []);
    } catch (err) {
      console.error('Could not load comments', err);
    } finally {
      setLoading(false);
    }
  }

  async function submitComment(e) {
    e.preventDefault();
    if (!text || !text.trim()) return;

    // optimistic
    const tempId = 't-' + Date.now();
    const temp = {
      id: tempId,
      user_id: currentUser?.id || null,
      username: currentUser?.username || 'You',
      content: text,
      created_at: new Date().toISOString(),
      isTemp: true
    };
    setComments(prev => [temp, ...prev]);
    setText('');

    try {
      const res = await api.post(`/posts/${postId}/comment`, { content: temp.content });
      const saved = res.data;
      // replace temp with actual saved comment
      setComments(prev => prev.map(c => (c.id === tempId ? saved : c)));
    } catch (err) {
      // remove temp and show error
      setComments(prev => prev.filter(c => c.id !== tempId));
      console.error('Failed to add comment', err);
      alert('Failed to add comment.');
    }
  }

  return (
    <div style={{ marginTop: 8 }}>
      <form onSubmit={submitComment} style={{ marginBottom: 8 }}>
        <input
          placeholder="Write a comment..."
          value={text}
          onChange={e => setText(e.target.value)}
          style={{ width: '70%', marginRight: 8 }}
        />
        <button type="submit">Post</button>
      </form>

      {loading ? <div>Loading comments…</div>
        : comments.length === 0 ? <div style={{ color: '#666' }}>No comments yet</div>
        : comments.map(c => (
          <div key={c.id} style={{ borderTop: '1px solid #eee', paddingTop: 6, marginTop: 6 }}>
            <b>{c.username}</b> <small style={{ color: '#666' }}>{new Date(c.created_at).toLocaleString()}</small>
            <div style={{ whiteSpace: 'pre-wrap' }}>{c.content}</div>
          </div>
        ))
      }
    </div>
  );
}
