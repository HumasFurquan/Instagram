// frontend/src/components/CreatePost.jsx
import React, { useState, useRef } from 'react';
import api from '../api';
import './CreatePost.css';

export default function CreatePost({ token, onPostCreated }) {
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!content && !imageFile) return;

    const formData = new FormData();
    formData.append('content', content);
    if (imageFile) formData.append('image', imageFile);

    try {
      setLoading(true);
      const res = await api.post('/posts', formData, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      });

      setContent('');
      setImageFile(null);
      onPostCreated?.(res.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Post failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form className="create-post-card" onSubmit={submit}>
      <h3 className="create-post-title">Create a post</h3>

      <textarea
        className="create-post-textarea"
        rows="3"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="What's on your mind?"
        disabled={loading}
      />

      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        className="hidden-file-input"
        onChange={(e) => setImageFile(e.target.files[0])}
      />

      <div className="create-post-actions">
        <button
          type="button"
          className="image-button"
          onClick={() => fileInputRef.current.click()}
          disabled={loading}
        >
          <i className="fa-solid fa-camera"></i>
          <span> Image</span>
        </button>

        <button
          type="submit"
          className="post-button"
          disabled={loading || (!content && !imageFile)}
        >
          {loading ? "Posting..." : "Post"}
        </button>
      </div>

      {imageFile && (
        <div className="image-preview">
          <div className="image-wrapper">
            <img src={URL.createObjectURL(imageFile)} alt="Preview" />

            <button
              type="button"
              className="remove-image-overlay"
              onClick={() => setImageFile(null)}
              aria-label="Remove image"
            >
              <i className="fa-solid fa-trash"></i>
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
