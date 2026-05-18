'use client';

import React, { useState, useEffect } from 'react';
import GameLayout from '../Shared/GameLayout';
import { useWallet } from '@/context/WalletContext';
import styles from './DiceGame.module.css';
import controlStyles from '../CrashGame.module.css';
import { audioSystem } from '@/lib/audio';

export default function DiceGame() {
  const { balance, deductBalance, addBalance } = useWallet();
  const [betAmount, setBetAmount] = useState('10.00');
  
  const [target, setTarget] = useState(50.50);
  const [isRollOver, setIsRollOver] = useState(true);
  const [rollResult, setRollResult] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [winStatus, setWinStatus] = useState<'win'|'lose'|null>(null);

  // Math for multiplier
  // 1% house edge means total payout is 99
  const winChance = isRollOver ? 100 - target : target;
  const multiplier = 99 / winChance;

  const handleRoll = async () => {
    const bet = parseFloat(betAmount);
    if (isNaN(bet) || bet <= 0 || bet > balance) return alert('Invalid bet or insufficient funds');

    setIsRolling(true);
    setWinStatus(null);
    audioSystem.init();
    
    // Simulate quick roll animation for visual effect
    let ticks = 0;
    const interval = setInterval(() => {
      setRollResult(Math.random() * 100);
      ticks++;
    }, 100);

    try {
      const res = await fetch('/api/virtuals/dice', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ betAmount: bet, target, isRollOver })
      });
      const data = await res.json();
      
      clearInterval(interval);
      setIsRolling(false);
      
      if (!res.ok) throw new Error(data.error);

      setRollResult(data.rollResult);
      setWinStatus(data.isWin ? 'win' : 'lose');
      
      if (data.isWin) {
        audioSystem.playCashout();
      } else {
        audioSystem.playBomb();
      }
    } catch (e: any) {
      clearInterval(interval);
      setIsRolling(false);
      alert(e.message || 'Failed to roll securely');
    }
  };

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let val = parseFloat(e.target.value);
    // restrict target so multiplier isn't insane or 0
    if (val < 2) val = 2;
    if (val > 98) val = 98;
    setTarget(val);
  };

  const controls = (
    <div className={controlStyles.controlPanel} style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }}>
       <div className={controlStyles.panelTabs}>
         <button className={controlStyles.panelTabActive}>Manual</button>
         <button className={controlStyles.panelTab}>Auto</button>
       </div>
       <div className={controlStyles.panelBody}>
         <div className={controlStyles.betAdjuster}>
           <label style={{color: '#888', fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem'}}>Bet Amount</label>
           <div className={controlStyles.stepper}>
             <button onClick={() => setBetAmount(p => Math.max(1, parseFloat(p)-1).toFixed(2))} disabled={isRolling}>-</button>
             <input type="number" value={betAmount} onChange={e => setBetAmount(e.target.value)} disabled={isRolling} />
             <button onClick={() => setBetAmount(p => (parseFloat(p)+1).toFixed(2))} disabled={isRolling}>+</button>
           </div>
           <div className={controlStyles.quickBets}>
             <button onClick={() => setBetAmount(p => (parseFloat(p)/2).toFixed(2))}>½</button>
             <button onClick={() => setBetAmount(p => (parseFloat(p)*2).toFixed(2))}>2×</button>
             <button onClick={() => setBetAmount(balance.toFixed(2))}>Max</button>
           </div>
         </div>
         
         <div className={controlStyles.actionBtnContainer}>
           <button 
             className={`${controlStyles.actionBtn} ${controlStyles.btnBet}`} 
             onClick={handleRoll}
             disabled={isRolling}
           >
              <span className={controlStyles.btnTitle}>{isRolling ? 'ROLLING...' : 'ROLL DICE'}</span>
           </button>
         </div>
       </div>
    </div>
  );

  return (
    <GameLayout 
      players={[]} 
      controls={controls}
      instructions={[
        "Set your bet amount.",
        "Drag the slider to choose your target number (2 to 98).",
        "Toggle between 'Roll Over' or 'Roll Under'.",
        "Your payout multiplier and win chance will update automatically.",
        "Click ROLL. A random number from 0 to 100 will be generated.",
        "If the roll meets your condition, you win the multiplier!"
      ]}
    >
      <div className={styles.container}>
        
        <div className={styles.mainDisplay}>
          
          <div className={styles.toggleContainer}>
            <button 
              className={`${styles.toggleBtn} ${isRollOver ? styles.active : ''}`}
              onClick={() => setIsRollOver(true)}
            >
              Roll Over
            </button>
            <button 
              className={`${styles.toggleBtn} ${!isRollOver ? styles.active : ''}`}
              onClick={() => setIsRollOver(false)}
            >
              Roll Under
            </button>
          </div>

          <div className={`${styles.rollResult} ${winStatus === 'win' ? styles.rollWin : winStatus === 'lose' ? styles.rollLose : styles.rollNeutral}`}>
            {rollResult !== null ? rollResult.toFixed(2) : '50.00'}
          </div>

          <div className={styles.sliderContainer}>
            <div className={styles.sliderTrack}>
              {isRollOver ? (
                 <div className={styles.sliderFillOver} style={{ width: `${100 - target}%` }}></div>
              ) : (
                 <div className={styles.sliderFillUnder} style={{ width: `${target}%` }}></div>
              )}
            </div>
            <input 
              type="range" 
              min="0" 
              max="100" 
              step="0.01"
              value={target}
              onChange={handleSliderChange}
              className={styles.slider}
            />
            <div className={styles.targetLabel} style={{ left: `${target}%` }}>
              {target.toFixed(2)}
            </div>
            <div className={styles.sliderLabels}>
              <span>0</span>
              <span>25</span>
              <span>50</span>
              <span>75</span>
              <span>100</span>
            </div>
          </div>

          <div className={styles.statsGrid}>
            <div className={styles.statBox}>
              <span className={styles.statLabel}>Multiplier</span>
              <span className={styles.statValue}>{multiplier.toFixed(4)}x</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statLabel}>Win Chance</span>
              <span className={styles.statValue}>{winChance.toFixed(2)}%</span>
            </div>
            <div className={styles.statBox}>
              <span className={styles.statLabel}>Payout on Win</span>
              <span className={styles.statValue}>{(parseFloat(betAmount) * multiplier).toFixed(2)}</span>
            </div>
          </div>

        </div>

      </div>
    </GameLayout>
  );
}
