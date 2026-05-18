'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';

export default function VirtualsLayout({ children }: { children: React.ReactNode }) {
  const { user, isLoading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    // Only redirect AFTER the auth session has been fully checked.
    // Without isLoading guard, user is null during the fetch and
    // causes a false redirect on every page refresh.
    if (!isLoading && (!user || user.isGuest)) {
      router.push('/register');
    }
  }, [user, isLoading, router]);

  // Show a loading screen while session is being verified
  if (isLoading) {
    return (
      <div style={{
        minHeight: '80vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at center, #1b0c30 0%, #08030d 100%)',
      }}>
        <div style={{ textAlign: 'center', color: '#fff' }}>
          <div style={{
            width: '48px', height: '48px', border: '3px solid #333',
            borderTop: '3px solid var(--accent-primary)', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem',
          }} />
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Verifying session...</p>
        </div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    );
  }

  if (!user || user.isGuest) {
    return null; // redirect is already queued in useEffect
  }

  return <>{children}</>;
}

