'use client';

import React, { useId } from 'react';

interface LogoProps {
  size?: number;
  className?: string;
  glow?: boolean;
}

export default function Logo({ size = 32, className = '', glow = true }: LogoProps) {
  const id = useId();
  
  // Strip special chars from React useId to generate valid SVG id attributes
  const safeId = id.replace(/:/g, '-');
  
  const logoGradId = `logoGrad-${safeId}`;
  const boltGradId = `boltGrad-${safeId}`;
  const logoGlowId = `logoGlow-${safeId}`;

  return (
    <svg 
      width={size} 
      height={size} 
      viewBox="0 0 34 34" 
      fill="none" 
      xmlns="http://www.w3.org/2000/svg" 
      className={className}
      style={{
        display: 'inline-block',
        verticalAlign: 'middle',
        transition: 'all 0.3s ease'
      }}
    >
      <defs>
        <linearGradient id={logoGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#00e676" />
          <stop offset="100%" stopColor="#a367ff" />
        </linearGradient>
        <linearGradient id={boltGradId} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#00e676" />
        </linearGradient>
        {glow && (
          <filter id={logoGlowId} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="2" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        )}
      </defs>
      <polygon 
        points="17,3 30,10 30,24 17,31 4,24 4,10" 
        fill="rgba(163, 103, 255, 0.06)" 
        stroke={`url(#${logoGradId})`} 
        strokeWidth="2" 
        filter={glow ? `url(#${logoGlowId})` : undefined}
      />
      <path 
        d="M19 8L10 18H16L15 26L24 16H18L19 8Z" 
        fill={`url(#${boltGradId})`} 
        filter={glow ? "drop-shadow(0px 0px 4px rgba(0, 230, 118, 0.6))" : undefined}
      />
    </svg>
  );
}
