import React, {useState} from 'react';
import api from '../api';
import './Signup.css';

export default function Signup({onAuth}) {
  const [form, setForm] = useState({username:'', email:'', password:''});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const res = await api.post('/auth/signup', form);
      onAuth(res.data);
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Signup failed. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="signup-card">
      <div className="signup-header">
        <h2 className="signup-title">Signup</h2>
      </div>
      
      <form className="signup-form" onSubmit={submit}>
          <div className="form-group">
            <input
              className="signup-input"
              type="text"
              placeholder="Username"
              value={form.username}
              onChange={e => setForm({...form, username: e.target.value})}
              required
              disabled={loading}
              aria-label="Username"
            />
          </div>

          <div className="form-group">
            <input
              className="signup-input"
              type="email"
              placeholder="Email address"
              value={form.email}
              onChange={e => setForm({...form, email: e.target.value})}
              required
              disabled={loading}
              aria-label="Email address"
            />
          </div>
          
          <div className="form-group">
            <input
              className="signup-input"
              type="password"
              placeholder="Password"
              value={form.password}
              onChange={e => setForm({...form, password: e.target.value})}
              required
              disabled={loading}
              aria-label="Password"
            />
          </div>

          {error && (
            <div className="error-message" role="alert">
              <span className="error-icon">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          <button 
            type="submit" 
            className="signup-button"
            disabled={loading || !form.username || !form.email || !form.password}
          >
            {loading ? (
              <>
                <span className="loading-spinner"></span>
                Creating account...
              </>
            ) : (
              'Sign Up'
            )}
          </button>
        </form>
    </div>
  );
}
