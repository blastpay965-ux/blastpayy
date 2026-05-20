'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { notFound } from 'next/navigation';
import { Shield, Key, Loader2, AlertTriangle, ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import styles from './login.module.css';

export default function AdminLoginPage() {
  const [pin, setPin] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSecretAuthorized, setIsSecretAuthorized] = useState<boolean | null>(null);
  const router = useRouter();

  // Validate the secret gate parameter (?gate=secure) client-side to prevent Suspense errors on build
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const isGateOpen = params.get('gate') === 'secure' || sessionStorage.getItem('blastpay_admin_pin');
      if (isGateOpen) {
        setIsSecretAuthorized(true);
      } else {
        setIsSecretAuthorized(false);
      }
    }
  }, []);

  // If already authorized, route immediately to dashboard
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const activePin = sessionStorage.getItem('blastpay_admin_pin');
      if (activePin) {
        router.replace('/admin');
      }
    }
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin) return setErrorMsg('Passcode is required');
    
    setErrorMsg('');
    setIsSubmitting(true);

    try {
      const res = await fetch('/api/admin/config', {
        headers: { 'x-admin-pin': pin },
        cache: 'no-store'
      });

      if (res.ok) {
        sessionStorage.setItem('blastpay_admin_pin', pin);
        
        // Log secure connection telemetry
        await fetch('/api/admin/logs', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-admin-pin': pin
          },
          body: JSON.stringify({
            tag: 'SECURITY',
            message: `🔐 Secure operator session initialized via dedicated login portal.`
          })
        }).catch(() => {});

        router.replace('/admin');
      } else {
        const errData = await res.json().catch(() => ({}));
        setErrorMsg(errData.error || 'ACCESS DENIED: INVALID SYSTEM PASSCODE');
      }
    } catch (err) {
      setErrorMsg('CONNECTION FAILED: SECURE GATEWAY OFFLINE');
    } finally {
      setIsSubmitting(false);
    }
  };
  if (isSecretAuthorized === false) {
    return notFound();
  }

  if (isSecretAuthorized === null) {
    return null;
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <div className={styles.header}>
          <div className={styles.logo}>
            <Shield size={32} />
          </div>
          <h1 className={styles.title}>Operator Terminal</h1>
          <p className={styles.subtitle}>Enter secure passcode to authorize administrative controls</p>
        </div>

        {errorMsg && (
          <div className={styles.error}>
            <AlertTriangle size={16} />
            <span>{errorMsg}</span>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className={styles.formGroup}>
            <label className={styles.label}>Access Key Passcode</label>
            <div className={styles.inputWrapper}>
              <input
                type="password"
                className={styles.input}
                placeholder="••••"
                maxLength={16}
                value={pin}
                onChange={(e) => setPin(e.target.value)}
                disabled={isSubmitting}
                autoFocus
              />
              <Key size={18} className={styles.inputIcon} />
            </div>
          </div>

          <button type="submit" className={styles.btn} disabled={isSubmitting}>
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="animate-spin" />
                Authorizing Session...
              </>
            ) : (
              'Unlock Terminal'
            )}
          </button>
        </form>

        <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
          <Link href="/virtuals" style={{ 
            fontSize: '0.8rem', 
            color: '#a367ff', 
            textDecoration: 'none',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '0.4rem',
            fontWeight: 600
          }}>
            <ArrowLeft size={14} /> Back to Lobby
          </Link>
        </div>
      </div>
      <div className={styles.footer}>
        BlastPay High-Trust Operations. Realtime Encrypted Console.
      </div>
    </div>
  );
}
