'use client';

import React, { useState, useRef } from 'react';
import GameLayout from '../Shared/GameLayout';
import { useWallet } from '@/context/WalletContext';
import styles from './WheelGame.module.css';
import controlStyles from '../CrashGame.module.css';

// 8 Segments
const SEGMENTS = [
  { mult: 0.00, color: '#ff4444' },
  { mult: 1.20, color: '#3b4150' },
  { mult: 1.50, color: '#a367ff' },
  { mult: 0.00, color: '#ff4444' },
  { mult: 2.00, color: '#00e676' },
  { mult: 1.20, color: '#3b4150' },
  { mult: 3.00, color: '#fdd835' },
  { mult: 0.00, color: '#ff4444' }
];

export default function WheelGame() {
  const { balance, deductBalance, addBalance } = useWallet();
  const [betAmount, setBetAmount] = useState('10.00');
  
  const [isSpinning, setIsSpinning] = useState(false);
  const [rotation, setRotation] = useState(0);
  const [winStatus, setWinStatus] = useState<boolean | null>(null);
  const [activeMult, setActiveMult] = useState(0);

  const handleSpin = async () => {
    const bet = parseFloat(betAmount);
    if (isNaN(bet) || bet <= 0 || bet > balance) return alert('Invalid bet or insufficient funds');

    setIsSpinning(true);
    setWinStatus(null);
    setActiveMult(0);

    try {
      const res = await fetch('/api/virtuals/wheel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ betAmount: bet })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const { winningIndex, mult } = data;
      const segmentAngle = 360 / SEGMENTS.length;
      const extraSpins = 3 * 360;
      const targetAngle = 360 - (winningIndex * segmentAngle);
      const forcedTotalRotation = rotation + extraSpins + targetAngle - (segmentAngle / 2);
      setRotation(forcedTotalRotation);

      setTimeout(() => {
        setActiveMult(mult);
        setWinStatus(mult > 0);
        setIsSpinning(false);
      }, 3000);
    } catch (e: any) {
      setIsSpinning(false);
      alert(e.message || 'Failed to spin securely');
    }
  };

  const controls = (
    <div className={controlStyles.controlPanel} style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }}>
       <div className={controlStyles.panelTabs}>
         <button className={controlStyles.panelTabActive}>Bet</button>
       </div>
       <div className={controlStyles.panelBody}>
         <div className={controlStyles.betAdjuster}>
           <label style={{color: '#888', fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem'}}>Bet Amount</label>
           <div className={controlStyles.stepper}>
             <button onClick={() => setBetAmount(p => Math.max(1, parseFloat(p)-1).toFixed(2))} disabled={isSpinning}>-</button>
             <input type="number" value={betAmount} onChange={e => setBetAmount(e.target.value)} disabled={isSpinning} />
             <button onClick={() => setBetAmount(p => (parseFloat(p)+1).toFixed(2))} disabled={isSpinning}>+</button>
           </div>
           <div className={controlStyles.quickBets}>
             <button onClick={() => setBetAmount(p => (parseFloat(p)/2).toFixed(2))} disabled={isSpinning}>½</button>
             <button onClick={() => setBetAmount(p => (parseFloat(p)*2).toFixed(2))} disabled={isSpinning}>2×</button>
             <button onClick={() => setBetAmount(balance.toFixed(2))} disabled={isSpinning}>Max</button>
           </div>
         </div>
         
         <div className={controlStyles.actionBtnContainer}>
           <button 
             className={`${controlStyles.actionBtn} ${controlStyles.btnBet}`} 
             onClick={handleSpin}
             disabled={isSpinning}
             style={{backgroundColor: '#a367ff', color: '#fff'}}
           >
              <span className={controlStyles.btnTitle}>{isSpinning ? 'SPINNING...' : 'SPIN WHEEL'}</span>
           </button>
         </div>
       </div>
    </div>
  );

  const segmentAngle = 360 / SEGMENTS.length;

  return (
    <GameLayout 
      players={[]} 
      controls={controls}
      instructions={[
        "Set your bet amount.",
        "Click SPIN WHEEL to rotate the wheel of fortune.",
        "The wheel will slow down and land on a segment.",
        "The segment multiplier is applied to your bet. Landing on 0.00x is a bust."
      ]}
    >
      <div className={styles.container}>
        
        <div className={styles.wheelWrapper}>
          <div className={styles.wheelPointer}></div>
          <div 
            className={styles.wheel} 
            style={{ transform: `rotate(${rotation}deg)` }}
          >
            {SEGMENTS.map((seg, i) => {
              const rot = i * segmentAngle;
              // using conic-gradient for the segments is easiest for a wheel
              return null; // We'll use conic-gradient on the wheel itself
            })}
          </div>
          {/* Overriding wheel to use conic gradient */}
          <div 
            className={styles.wheel}
            style={{ 
              position: 'absolute', top: 0, left: 0,
              transform: `rotate(${rotation}deg)`,
              background: `conic-gradient(
                ${SEGMENTS.map((seg, i) => `${seg.color} ${i * segmentAngle}deg ${(i + 1) * segmentAngle}deg`).join(', ')}
              )`
            }}
          >
             {SEGMENTS.map((seg, i) => {
                const rot = (i * segmentAngle) + (segmentAngle / 2);
                return (
                  <div key={i} style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: `translate(-50%, -50%) rotate(${rot}deg) translateY(-100px)`,
                    color: '#fff',
                    fontWeight: 'bold',
                    textShadow: '0 2px 4px rgba(0,0,0,0.8)'
                  }}>
                    {seg.mult}x
                  </div>
                )
             })}
          </div>
        </div>

        {winStatus !== null && !isSpinning && (
          <div className={styles.gameEndOverlay}>
            <div className={winStatus ? styles.winText : styles.loseText}>
              {activeMult}x
            </div>
            {winStatus && (
              <div style={{color: '#fff', fontSize: '1.5rem', fontWeight: 'bold'}}>
                +{(parseFloat(betAmount) * activeMult).toFixed(2)} NGN
              </div>
            )}
            <button className="btn btn-primary" onClick={() => setWinStatus(null)} style={{marginTop: '1rem'}}>
              Dismiss
            </button>
          </div>
        )}

      </div>
    </GameLayout>
  );
}
