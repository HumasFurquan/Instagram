import React, {useState} from 'react';
import api from '../api';

export default function CreatePost({token}) {
  const [content, setContent] = useState('');
  const submit = async e => {
    e.preventDefault();
    try {
      const res = await api.post('/posts', {content}, { headers: { Authorization: `Bearer ${token}` }});
      alert('Posted!');
      setContent('');
      // optionally fire an event / state to refresh feed
    } catch (err) {
      alert(err.response?.data?.error || 'Post failed');
    }
  };
  return (
    <form onSubmit={submit}>
      <h3>Create a post</h3>
      <textarea rows="3" value={content} onChange={e=>setContent(e.target.value)} /><br/>
      <button type="submit">Post</button>
    </form>
  );
}
