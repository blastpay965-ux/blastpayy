'use client';

import { useState } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { AlertCircle, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsSubmitting(true);
    if (username) {
      const res = await login(username, password);
      if (!res.success) {
        setErrorMsg(res.error || 'Invalid username or password');
      }
    }
    setIsSubmitting(false);
  };

  return (
    <div className="auth-container" style={{ background: 'radial-gradient(circle at top, #1e1233 0%, #0d0614 100%)', minHeight: '90vh' }}>
      <div className="auth-card animate-fade-in" style={{ background: 'rgba(20, 10, 30, 0.65)', backdropFilter: 'blur(10px)', border: '1px solid rgba(163, 103, 255, 0.15)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, background: 'linear-gradient(135deg, #fff 0%, var(--accent-primary) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '1.5rem' }}>
          Welcome Back
        </h2>
        
        {errorMsg && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'rgba(255, 68, 68, 0.1)', color: '#ff4444', border: '1px solid rgba(255, 68, 68, 0.2)', padding: '0.75rem', borderRadius: '4px', fontSize: '0.8rem', marginBottom: '1.25rem', fontWeight: 600 }}>
            <AlertCircle size={16} /> {errorMsg}
          </div>
        )}

        <form onSubmit={handleLogin} className="auth-form">
          <div className="form-group">
            <label>Username</label>
            <input 
              type="text" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              placeholder="Enter your username"
              required 
              style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: '#fff' }}
            />
          </div>
          <div className="form-group" style={{ marginBottom: '0.5rem' }}>
            <label>Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="••••••••"
              required 
              style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: '#fff' }}
            />
          </div>
          
          <button 
            type="submit" 
            className="btn btn-primary full-width"
            disabled={isSubmitting}
            style={{ marginTop: '0.5rem' }}
          >
            {isSubmitting ? (
              <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <Loader2 size={18} className="animate-spin" /> Authenticating...
              </span>
            ) : 'Secure Login'}
          </button>
        </form>

        <p className="auth-footer" style={{ marginTop: '1.5rem' }}>
          Don&apos;t have an account? <Link href="/register">Register</Link>
        </p>
      </div>
    </div>
  );
}

