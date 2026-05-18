'use client';

import { useState, useEffect, useRef } from 'react';
import { useAuth } from '@/context/AuthContext';
import Link from 'next/link';
import { Phone, Mail, Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

export default function RegisterPage() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [registerMethod, setRegisterMethod] = useState<'phone' | 'email'>('phone');
  const [contact, setContact] = useState('');
  const [referralCode, setReferralCode] = useState('');
  
  // OTP Verification Modal State
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpTimer, setOtpTimer] = useState(60);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const { register } = useAuth();
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Manage OTP Resend Countdown
  useEffect(() => {
    if (isOtpSent && otpTimer > 0) {
      timerRef.current = setTimeout(() => {
        setOtpTimer(prev => prev - 1);
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [isOtpSent, otpTimer]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!username || !password || !contact) {
      return setErrorMsg('Please fill in all registration fields.');
    }

    if (registerMethod === 'phone' && contact.length < 10) {
      return setErrorMsg('Please enter a valid phone number.');
    }

    if (registerMethod === 'email' && !contact.includes('@')) {
      return setErrorMsg('Please enter a valid email address.');
    }

    setIsSubmitting(true);

    try {
      // Validate referral code beforehand to improve UX
      if (referralCode) {
        const checkRes = await fetch(`/api/auth/register?checkReferral=${encodeURIComponent(referralCode.trim())}`);
        const checkData = await checkRes.json();
        if (!checkRes.ok) {
          setErrorMsg(checkData.error || 'The referral code is invalid.');
          setIsSubmitting(false);
          return;
        }
        if (referralCode.trim().toLowerCase() === username.trim().toLowerCase()) {
          setErrorMsg('You cannot refer yourself.');
          setIsSubmitting(false);
          return;
        }
      }

      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact, method: registerMethod }),
      });
      const result = await res.json();

      if (res.ok && result.status === 'success') {
        setIsOtpSent(true);
        setOtpTimer(60);
        setSuccessMsg(result.message);
      } else {
        setErrorMsg(result.error || 'Failed to send OTP code.');
      }
    } catch (err) {
      setErrorMsg('Auth server offline. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleVerifyAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (otp.length < 6) {
      return setErrorMsg('Please enter the full 6-digit code.');
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/otp/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact, code: otp }),
      });
      const result = await res.json();

      if (res.ok && result.status === 'success') {
        // Complete the auth context registration
        const regResult = await register(username, password, contact, referralCode.trim() || undefined);
        if (!regResult.success) {
          setErrorMsg(regResult.error || 'Registration failed.');
        }
      } else {
        setErrorMsg(result.error || 'Verification failed.');
      }
    } catch (err) {
      setErrorMsg('Verification system offline. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleResendOtp = async () => {
    if (otpTimer > 0) return;
    setErrorMsg('');
    setSuccessMsg('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/otp/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contact, method: registerMethod }),
      });
      const result = await res.json();

      if (res.ok && result.status === 'success') {
        setOtpTimer(60);
        setSuccessMsg('A fresh verification code has been dispatched.');
      } else {
        setErrorMsg(result.error || 'Failed to dispatch code.');
      }
    } catch (err) {
      setErrorMsg('Auth server offline. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="auth-container" style={{ background: 'radial-gradient(circle at top, #1e1233 0%, #0d0614 100%)', minHeight: '90vh' }}>
      
      {/* Dynamic OTP Verification Modal Overlay */}
      {isOtpSent && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100vw',
          height: '100vh',
          backgroundColor: 'rgba(0,0,0,0.85)',
          backdropFilter: 'blur(5px)',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '1rem'
        }}>
          <div className="auth-card" style={{ border: '1px solid rgba(163, 103, 255, 0.3)', background: 'rgba(20, 10, 30, 0.95)' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: 'var(--accent-primary)', marginBottom: '0.5rem', textAlign: 'center' }}>
              OTP Verification
            </h2>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '1.5rem' }}>
              We sent a 6-digit code to <strong>{contact}</strong>. Please enter it below.
            </p>

            {successMsg && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'rgba(0, 230, 118, 0.1)', color: '#00e676', border: '1px solid rgba(0, 230, 118, 0.2)', padding: '0.75rem', borderRadius: '4px', fontSize: '0.8rem', marginBottom: '1rem', fontWeight: 600 }}>
                <CheckCircle2 size={16} /> {successMsg}
              </div>
            )}

            {errorMsg && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'rgba(255, 68, 68, 0.1)', color: '#ff4444', border: '1px solid rgba(255, 68, 68, 0.2)', padding: '0.75rem', borderRadius: '4px', fontSize: '0.8rem', marginBottom: '1rem', fontWeight: 600 }}>
                <AlertCircle size={16} /> {errorMsg}
              </div>
            )}

            <form onSubmit={handleVerifyAndRegister} className="auth-form">
              <div className="form-group" style={{ textAlign: 'center' }}>
                <input 
                  type="text" 
                  maxLength={6}
                  placeholder="0 0 0 0 0 0"
                  style={{
                    fontSize: '2rem',
                    textAlign: 'center',
                    letterSpacing: '0.5em',
                    fontWeight: 900,
                    padding: '0.85rem',
                    background: 'rgba(0,0,0,0.3)',
                    border: '1px solid var(--border-color)',
                    color: 'var(--text-primary)',
                    borderRadius: '8px',
                    outline: 'none',
                    width: '100%',
                  }}
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
                  disabled={isSubmitting}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.8rem', margin: '0.5rem 0' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Didn't receive code?</span>
                {otpTimer > 0 ? (
                  <span style={{ color: 'var(--accent-primary)', fontWeight: 700 }}>Resend in {otpTimer}s</span>
                ) : (
                  <button 
                    type="button" 
                    onClick={handleResendOtp} 
                    style={{ background: 'transparent', border: 'none', color: '#00e676', fontWeight: 700, cursor: 'pointer', padding: 0 }}
                    disabled={isSubmitting}
                  >
                    Resend Code
                  </button>
                )}
              </div>

              <button 
                type="submit" 
                className="btn btn-primary full-width"
                disabled={isSubmitting}
                style={{ marginTop: '1rem' }}
              >
                {isSubmitting ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <Loader2 size={16} className="animate-spin" /> Verifying OTP...
                  </span>
                ) : 'Verify & Complete Signup'}
              </button>

              <button 
                type="button" 
                className="btn btn-secondary full-width"
                onClick={() => {
                  setIsOtpSent(false);
                  setOtp('');
                  setErrorMsg('');
                  setSuccessMsg('');
                }}
                disabled={isSubmitting}
                style={{ marginTop: '0.5rem' }}
              >
                Go Back
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Main Registration Card */}
      <div className="auth-card animate-fade-in" style={{ background: 'rgba(20, 10, 30, 0.65)', backdropFilter: 'blur(10px)', border: '1px solid rgba(163, 103, 255, 0.15)', boxShadow: '0 20px 40px rgba(0,0,0,0.5)' }}>
        <h2 style={{ fontSize: '1.75rem', fontWeight: 800, background: 'linear-gradient(135deg, #fff 0%, var(--accent-primary) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent', marginBottom: '1.5rem' }}>
          Create Account
        </h2>

        {errorMsg && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'rgba(255, 68, 68, 0.1)', color: '#ff4444', border: '1px solid rgba(255, 68, 68, 0.2)', padding: '0.75rem', borderRadius: '4px', fontSize: '0.8rem', marginBottom: '1.25rem', fontWeight: 600 }}>
            <AlertCircle size={16} /> {errorMsg}
          </div>
        )}

        {/* Method Toggles */}
        <div style={{
          display: 'flex',
          backgroundColor: 'rgba(0,0,0,0.3)',
          border: '1px solid var(--border-color)',
          borderRadius: '8px',
          padding: '0.25rem',
          marginBottom: '1.5rem'
        }}>
          <button 
            type="button"
            style={{
              flex: 1,
              padding: '0.6rem',
              background: registerMethod === 'phone' ? 'var(--accent-primary)' : 'transparent',
              color: registerMethod === 'phone' ? '#fff' : 'var(--text-secondary)',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.85rem',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s ease'
            }}
            onClick={() => {
              setRegisterMethod('phone');
              setContact('');
              setErrorMsg('');
            }}
          >
            <Phone size={14} /> Phone Number
          </button>
          <button 
            type="button"
            style={{
              flex: 1,
              padding: '0.6rem',
              background: registerMethod === 'email' ? 'var(--accent-primary)' : 'transparent',
              color: registerMethod === 'email' ? '#fff' : 'var(--text-secondary)',
              border: 'none',
              fontWeight: 700,
              fontSize: '0.85rem',
              borderRadius: '6px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              transition: 'all 0.2s ease'
            }}
            onClick={() => {
              setRegisterMethod('email');
              setContact('');
              setErrorMsg('');
            }}
          >
            <Mail size={14} /> Email Address
          </button>
        </div>

        <form onSubmit={handleSendOtp} className="auth-form">
          <div className="form-group">
            <label>Username</label>
            <input 
              type="text" 
              value={username} 
              onChange={e => setUsername(e.target.value)} 
              placeholder="Enter unique username"
              required 
              style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: '#fff' }}
            />
          </div>

          <div className="form-group">
            <label>{registerMethod === 'phone' ? 'Mobile Phone Number' : 'Email Address'}</label>
            <input 
              type={registerMethod === 'phone' ? 'tel' : 'email'} 
              value={contact} 
              onChange={e => setContact(e.target.value)} 
              placeholder={registerMethod === 'phone' ? 'e.g. +2348012345678' : 'user@domain.com'}
              required 
              style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: '#fff' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '0.5rem' }}>
            <label>Secure Password</label>
            <input 
              type="password" 
              value={password} 
              onChange={e => setPassword(e.target.value)} 
              placeholder="••••••••"
              required 
              style={{ background: 'rgba(0,0,0,0.3)', border: '1px solid var(--border-color)', color: '#fff' }}
            />
          </div>

          <div className="form-group" style={{ marginBottom: '0.5rem' }}>
            <label>Referral Code (Optional)</label>
            <input 
              type="text" 
              value={referralCode} 
              onChange={e => setReferralCode(e.target.value)} 
              placeholder="e.g. referrer_username"
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
                <Loader2 size={18} className="animate-spin" /> Transmitting OTP...
              </span>
            ) : 'Send Verification OTP'}
          </button>
        </form>

        <p className="auth-footer">
          Already have an account? <Link href="/login">Login</Link>
        </p>
      </div>
    </div>
  );
}
