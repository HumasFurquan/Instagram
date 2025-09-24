// frontend/src/components/CreatePost.jsx
import React, { useState, useRef } from 'react';
import api from '../api';

export default function CreatePost({ token, onPostCreated }) {
  const [content, setContent] = useState('');
  const [imageFile, setImageFile] = useState(null);
  const fileInputRef = useRef(null);
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!content && !imageFile) return; // disable empty posts

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

      // reset state
      setContent('');
      setImageFile(null);

      // let parent (Feed) optionally update instantly
      if (onPostCreated) onPostCreated(res.data);

    } catch (err) {
      console.error('Post failed:', err.response?.data?.error || err.message);
      alert(err.response?.data?.error || 'Post failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={submit} style={{ marginBottom: '1rem' }}>
      <h3>Create a post</h3>
      <textarea
        rows="3"
        value={content}
        onChange={(e) => setContent(e.target.value)}
        placeholder="What's on your mind?"
      /><br/>

      {/* Hidden file input */}
      <input
        type="file"
        accept="image/*"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={(e) => setImageFile(e.target.files[0])}
      />

      {/* Buttons */}
      <button
        type="button"
        onClick={() => fileInputRef.current.click()}
        style={{ marginRight: '0.5rem' }}
      >
        ➕ Image
      </button>

      <button
        type="submit"
        disabled={loading || (!content && !imageFile)}
      >
        {loading ? 'Posting...' : 'Post'}
      </button>

      {/* Preview selected image */}
      {imageFile && (
        <div style={{ marginTop: '0.5rem' }}>
          <img
            src={URL.createObjectURL(imageFile)}
            alt="Preview"
            style={{ maxWidth: '200px', borderRadius: 8 }}
          />
          <button type="button" onClick={() => setImageFile(null)}>❌ Remove</button>
        </div>
      )}
    </form>
  );
}
