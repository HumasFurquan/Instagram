import React, {useState} from 'react';
import api from '../api';
import './Login.css';

export default function Login({onAuth}) {
  const [form, setForm] = useState({email:'', password:''});
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async e => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const res = await api.post('/auth/login', form);
      // res.data should contain { token, user }
      onAuth(res.data);
    } catch (err) {
      const errorMessage = err.response?.data?.error || 'Login failed. Please try again.';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-card">
        <div className="login-header">
          <h2 className="login-title">Welcome Back</h2>
          <p className="login-subtitle">Sign in to continue to your account</p>
        </div>
        
        <form className="login-form" onSubmit={submit}>
          <div className="form-group">
            <input
              className="login-input"
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
              className="login-input"
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
            className="login-button"
            disabled={loading || !form.email || !form.password}
          >
            {loading ? (
              <>
                <span className="loading-spinner"></span>
                Signing in...
              </>
            ) : (
              'Sign In'
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
