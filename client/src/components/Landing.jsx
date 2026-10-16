import React from 'react';
import { useNavigate } from 'react-router-dom';
import { TrendingUp, Activity, Lock, BarChart2, HelpCircle } from 'lucide-react';
import '../index.css';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div style={{ minHeight: '100vh', backgroundColor: 'var(--bg-body)', color: 'var(--text-primary)', display: 'flex', flexDirection: 'column' }}>
      {/* Navigation */}
      <nav style={{ padding: '2rem 4rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <div style={{ width: '40px', height: '40px', borderRadius: '8px', background: 'linear-gradient(135deg, var(--color-accent) 0%, #3b82f6 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <TrendingUp size={24} color="white" />
          </div>
          <span style={{ fontSize: '1.5rem', fontWeight: 700, letterSpacing: '-0.5px' }}>MT5Connector</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button 
            onClick={() => navigate('/help')}
            style={{ padding: '0.75rem 1.25rem', background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '0.4rem' }}
          >
            <HelpCircle size={18} />
            <span>Help & Guides</span>
          </button>
          <button 
            onClick={() => navigate('/login')}
            style={{ padding: '0.75rem 1.5rem', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '6px', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 500 }}
          >
            Log In
          </button>
          <button 
            onClick={() => navigate('/register')}
            style={{ padding: '0.75rem 1.5rem', background: 'var(--color-accent)', border: 'none', borderRadius: '6px', color: 'white', cursor: 'pointer', fontWeight: 500 }}
          >
            Sign Up
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '4rem 2rem', textAlign: 'center' }}>
        <h1 style={{ fontSize: '4.5rem', fontWeight: 800, lineHeight: 1.1, marginBottom: '1.5rem', maxWidth: '800px', background: 'linear-gradient(to right, #ffffff, #9ca3af)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
          Professional Analytics for MetaTrader 5
        </h1>
        <p style={{ fontSize: '1.25rem', color: 'var(--text-secondary)', maxWidth: '600px', marginBottom: '3rem', lineHeight: 1.6 }}>
          Connect all your Live, Demo, and Prop Firm accounts into one unified dashboard. Get deep insights, P&L calendars, and automated EA performance tracking for free.
        </p>
        
        <div style={{ display: 'flex', gap: '1.5rem' }}>
          <button 
            onClick={() => navigate('/register')}
            style={{ padding: '1rem 2rem', fontSize: '1.1rem', background: 'linear-gradient(135deg, var(--color-accent) 0%, #3b82f6 100%)', border: 'none', borderRadius: '8px', color: 'white', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem', boxShadow: '0 4px 14px 0 rgba(59, 130, 246, 0.39)' }}
          >
            Get Started Free
          </button>
          <button 
            onClick={() => navigate('/help')}
            style={{ padding: '1rem 2rem', fontSize: '1.1rem', background: 'transparent', border: '1px solid var(--border-color)', borderRadius: '8px', color: 'var(--text-primary)', cursor: 'pointer', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}
          >
            Setup Guide & Help
          </button>
        </div>

        {/* Feature Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', width: '100%', maxWidth: '1000px', marginTop: '5rem' }}>
          
          <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'left' }}>
            <Activity size={32} style={{ color: 'var(--color-accent)', marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', fontWeight: 600 }}>Real-time Sync</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>Our lightweight EA pushes trade updates instantly to your dashboard without bloating your terminal.</p>
          </div>

          <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'left' }}>
            <BarChart2 size={32} style={{ color: 'var(--color-accent)', marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', fontWeight: 600 }}>Advanced Analytics</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>Visualize win rates, profit factors, drawdowns, and analyze performance by magic number or session.</p>
          </div>

          <div style={{ background: 'var(--bg-card)', padding: '2rem', borderRadius: '12px', border: '1px solid var(--border-color)', textAlign: 'left' }}>
            <Lock size={32} style={{ color: 'var(--color-accent)', marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.25rem', marginBottom: '0.5rem', fontWeight: 600 }}>Secure API Keys</h3>
            <p style={{ color: 'var(--text-secondary)', lineHeight: 1.5 }}>Your data is private. Connect securely using unique API keys without ever sharing your broker passwords.</p>
          </div>

        </div>
      </main>

      {/* Footer */}
      <footer style={{ padding: '2rem', textAlign: 'center', borderTop: '1px solid var(--border-color)', color: 'var(--text-muted)', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.75rem' }}>
        <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.9rem' }}>
          <span onClick={() => navigate('/help')} style={{ color: 'var(--text-secondary)', cursor: 'pointer' }}>Help & FAQ</span>
          <span onClick={() => navigate('/login')} style={{ color: 'var(--text-secondary)', cursor: 'pointer' }}>Log In</span>
          <span onClick={() => navigate('/register')} style={{ color: 'var(--text-secondary)', cursor: 'pointer' }}>Sign Up</span>
        </div>
        <p>&copy; 2026 MT5Connector. All rights reserved.</p>
      </footer>
    </div>
  );
}
