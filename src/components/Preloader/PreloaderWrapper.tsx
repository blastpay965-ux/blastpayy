'use client';

import { useState, useEffect } from 'react';
import Preloader from './Preloader';

export default function PreloaderWrapper({ children }: { children: React.ReactNode }) {
  // Only show the preloader on the very first visit (not on every refresh/navigation)
  const [loading, setLoading] = useState(false);
  const [fadeOut, setFadeOut] = useState(false);

  useEffect(() => {
    // Check if we've already shown the preloader this browser session
    const alreadyLoaded = sessionStorage.getItem('blastpay_loaded');
    if (alreadyLoaded) {
      setLoading(false);
      return;
    }

    // First ever visit — show the preloader once then remember it
    setLoading(true);
    sessionStorage.setItem('blastpay_loaded', '1');

    const fadeTimer = setTimeout(() => setFadeOut(true), 1800);
    const removeTimer = setTimeout(() => setLoading(false), 2200);

    return () => {
      clearTimeout(fadeTimer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (!loading) return <>{children}</>;

  return (
    <>
      <div style={{
        opacity: fadeOut ? 0 : 1,
        transition: 'opacity 0.4s ease-out',
        position: 'fixed',
        top: 0, left: 0,
        width: '100vw', height: '100vh',
        zIndex: 99999,
        pointerEvents: 'none'
      }}>
        <Preloader />
      </div>
      <div style={{
        opacity: fadeOut ? 1 : 0,
        transition: 'opacity 0.5s ease-in-out'
      }}>
        {children}
      </div>
    </>
  );
}
