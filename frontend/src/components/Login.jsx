import React, {useState} from 'react';
import api from '../api';

export default function Login({onAuth}) {
  const [form,setForm] = useState({email:'', password:''});
  const submit = async e => {
    e.preventDefault();
    try {
      const res = await api.post('/auth/login', form);
      // res.data should contain { token, user }
      onAuth(res.data);
    } catch (err) {
      alert(err.response?.data?.error || 'Login failed');
    }
  };
  return (
    <form onSubmit={submit}>
      <h2>Login</h2>
      <input
        placeholder="email"
        value={form.email}
        onChange={e=>setForm({...form, email:e.target.value})}
      /><br/>
      <input
        placeholder="password"
        type="password"
        value={form.password}
        onChange={e=>setForm({...form, password:e.target.value})}
      /><br/>
      <button type="submit">Login</button>
    </form>
  );
}
