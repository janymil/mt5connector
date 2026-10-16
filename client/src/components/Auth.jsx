import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { TrendingUp, AlertCircle } from 'lucide-react';

export default function Auth() {
  const navigate = useNavigate();
  const location = useLocation();
  const isLogin = location.pathname === '/login';

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    
    const endpoint = isLogin ? '/api/auth/login' : '/api/auth/register';
    
    try {
      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
      });
      
      const contentType = res.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        throw new Error('Server is initializing or unreachable. Please refresh and try again.');
      }
      
      const data = await res.json();
      
      if (!res.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      navigate('/dashboard');
      
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--bg-body)' }}>
      <div style={{ width: '100%', maxWidth: '400px', padding: '2rem', background: 'var(--bg-card)', borderRadius: '12px', border: '1px solid var(--border-color)', boxShadow: '0 8px 30px rgba(0,0,0,0.12)' }}>
        
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem', cursor: 'pointer' }} onClick={() => navigate('/')}>
          <div style={{ width: '48px', height: '48px', borderRadius: '10px', background: 'linear-gradient(135deg, var(--color-accent) 0%, #3b82f6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '1rem' }}>
            <TrendingUp size={28} color="white" />
          </div>
          <h2 style={{ margin: 0, fontSize: '1.5rem', color: 'var(--text-primary)' }}>
            {isLogin ? 'Welcome Back' : 'Create an Account'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.5rem', fontSize: '0.9rem' }}>
            {isLogin ? 'Sign in to access your dashboard' : 'Start tracking your trades for free'}
          </p>
        </div>

        {error && (
          <div style={{ padding: '0.75rem', background: 'rgba(239, 68, 68, 0.1)', border: '1px solid var(--color-error)', borderRadius: '6px', color: 'var(--color-error)', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
            <AlertCircle size={16} />
            <span>{error}</span>
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>Email Address</label>
            <input 
              type="email" 
              required
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-body)', color: 'var(--text-primary)', fontSize: '1rem' }}
              placeholder="you@example.com"
            />
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <label style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', fontWeight: 500 }}>Password</label>
            <input 
              type="password" 
              required
              value={password}
              onChange={e => setPassword(e.target.value)}
              style={{ padding: '0.75rem', borderRadius: '6px', border: '1px solid var(--border-color)', background: 'var(--bg-body)', color: 'var(--text-primary)', fontSize: '1rem' }}
              placeholder="••••••••"
            />
          </div>
          <button 
            type="submit" 
            disabled={loading}
            style={{ marginTop: '0.5rem', padding: '0.875rem', borderRadius: '6px', background: 'var(--color-accent)', color: 'white', border: 'none', fontSize: '1rem', fontWeight: 600, cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1 }}
          >
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        <div style={{ marginTop: '2rem', textAlign: 'center', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
          {isLogin ? (
            <p>Don't have an account? <span onClick={() => navigate('/register')} style={{ color: 'var(--color-accent)', cursor: 'pointer', fontWeight: 500 }}>Sign up</span></p>
          ) : (
            <p>Already have an account? <span onClick={() => navigate('/login')} style={{ color: 'var(--color-accent)', cursor: 'pointer', fontWeight: 500 }}>Sign in</span></p>
          )}
        </div>
      </div>
    </div>
  );
}
