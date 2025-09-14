import React, {useState} from 'react';
import api from '../api';

export default function Signup({onAuth}) {
  const [form,setForm] = useState({username:'', email:'', password:''});
  const submit = async e => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/signup', form);
      onAuth(res.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Signup failed');
    }
  };
  return (
    <form onSubmit={submit}>
      <h2>Signup</h2>
      <input placeholder="username" onChange={e=>setForm({...form, username:e.target.value})} /><br/>
      <input placeholder="email" onChange={e=>setForm({...form, email:e.target.value})} /><br/>
      <input placeholder="password" type="password" onChange={e=>setForm({...form, password:e.target.value})} /><br/>
      <button type="submit">Signup</button>
    </form>
  );
}
