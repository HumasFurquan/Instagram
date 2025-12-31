import React, { useEffect, useState } from "react";
import api from "../api";
import "./CommentsSection.css";

export default function CommentsSection({ postId, currentUser, onCommentAdded }) { // ✅ added onCommentAdded
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

      // replace temp comment with actual saved comment
      setComments(prev => prev.map(c => (c.id === tempId ? saved : c)));

      // ✅ notify PostItem/UserFeed to update comments_count
      if (onCommentAdded) {
        onCommentAdded(postId, saved);
      }

    } catch (err) {
      setComments(prev => prev.filter(c => c.id !== tempId));
      console.error('Failed to add comment', err);
      alert('Failed to add comment.');
    }
  }

  return (
    <div className="comments-section">
      <form className="comment-form" onSubmit={submitComment}>
        <input
          className="comment-input"
          placeholder="Write a comment..."
          value={text}
          onChange={e => setText(e.target.value)}
        />
        <button className="comment-post-btn" type="submit">Comment</button>
      </form>

      {loading ? (
        <div className="comment-loading">Loading comments…</div>
      ) : comments.length === 0 ? (
        <div className="comment-empty">No comments yet</div>
      ) : (
        comments.map(c => (
          <div key={c.id} className="comment-item">
            <div className="comment-header">
              <span className="comment-username">{c.username}</span>
              <span className="comment-time">
                {new Date(c.created_at).toLocaleString()}
              </span>
            </div>
            <div className="comment-content">{c.content}</div>
          </div>
        ))
      )}
    </div>
  );
}
