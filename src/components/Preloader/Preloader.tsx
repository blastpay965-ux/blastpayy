'use client';

import React, { useState, useEffect } from 'react';
import styles from './Preloader.module.css';
import Logo from '@/components/Logo/Logo';

export default function Preloader() {
  const [status, setStatus] = useState('Securing Connection...');

  useEffect(() => {
    const statuses = [
      'Securing Connection...',
      'Loading Blast Engine...',
      'Connecting NGN Gateways...',
      'Initializing provably fair game nodes...',
    ];

    let current = 0;
    const interval = setInterval(() => {
      current = (current + 1) % statuses.length;
      setStatus(statuses[current]);
    }, 450);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className={styles.preloader}>
      {/* Immersive Particle Burst Background */}
      <div className={styles.ambientParticles}>
        <div className={styles.particle} style={{ '--tx': '60px', '--ty': '-80px' } as React.CSSProperties} />
        <div className={styles.particle} style={{ '--tx': '-50px', '--ty': '70px' } as React.CSSProperties} />
        <div className={styles.particle} style={{ '--tx': '80px', '--ty': '40px' } as React.CSSProperties} />
        <div className={styles.particle} style={{ '--tx': '-70px', '--ty': '-50px' } as React.CSSProperties} />
        <div className={styles.particle} style={{ '--tx': '40px', '--ty': '-90px' } as React.CSSProperties} />
      </div>

      <div className={styles.logoContainer}>
        {/* Pulsing Brand Logotype */}
        <Logo size={64} className={styles.preloaderLogoSvg} />
        <div className={styles.logo}>
          BLAST<span className={styles.logoAccent}>PAY</span>
        </div>

        {/* Glowing Loading Bar */}
        <div className={styles.loadingBarContainer}>
          <div className={styles.loadingBar} />
        </div>

        {/* Blinking Connection Status */}
        <span className={styles.statusText}>{status}</span>
      </div>
    </div>
  );
}
