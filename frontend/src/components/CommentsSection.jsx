// src/components/CommentsSection.jsx
import React, { useEffect, useState } from "react";
import api from "../api";

export default function CommentsSection({ post, user, authHeaders }) {
  const [comments, setComments] = useState(post.comments || []);
  const [input, setInput] = useState("");

  useEffect(() => {
    fetchComments();
    // eslint-disable-next-line
  }, []);

  async function fetchComments() {
    try {
      const res = await api.get(`/posts/${post.id}/comments`, { headers: authHeaders() });
      setComments(res.data || []);
    } catch (err) {
      console.error("Failed to fetch comments", err);
    }
  }

  async function addComment() {
    if (!user || !input.trim()) return;

    const tempId = "t-" + Date.now();
    const tempComment = {
      id: tempId,
      username: user.username || "You",
      content: input,
      created_at: new Date().toISOString(),
      isTemp: true
    };

    setComments(prev => [tempComment, ...prev]);
    setInput("");

    try {
      const res = await api.post(`/posts/${post.id}/comment`, { content: input }, { headers: authHeaders() });
      const newComment = res.data;

      setComments(prev => prev.map(c => (c.id === tempId ? newComment : c)));
    } catch (err) {
      setComments(prev => prev.filter(c => c.id !== tempId));
      alert("Failed to add comment.");
    }
  }

  return (
    <div style={{ marginTop: 8 }}>
      <div style={{ marginBottom: 8 }}>
        <input
          placeholder="Write a comment..."
          value={input}
          onChange={e => setInput(e.target.value)}
          style={{ width: "70%", marginRight: 8 }}
        />
        <button onClick={addComment}>Post</button>
      </div>

      {comments.map(c => (
        <div key={c.id} style={{ borderTop: "1px solid #eee", paddingTop: 6, marginTop: 6 }}>
          <b>{c.username}</b>{" "}
          <small style={{ color: "#666" }}>{new Date(c.created_at).toLocaleString()}</small>
          <div>{c.content}</div>
        </div>
      ))}

      {comments.length === 0 && <div style={{ color: "#666" }}>No comments yet</div>}
    </div>
  );
}
