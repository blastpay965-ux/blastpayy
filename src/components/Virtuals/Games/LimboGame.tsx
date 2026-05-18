'use client';

import React, { useState } from 'react';
import GameLayout from '../Shared/GameLayout';
import { useWallet } from '@/context/WalletContext';
import styles from './LimboGame.module.css';
import controlStyles from '../CrashGame.module.css';

export default function LimboGame() {
  const { balance, deductBalance, addBalance } = useWallet();
  const [betAmount, setBetAmount] = useState('10.00');
  const [targetMultiplier, setTargetMultiplier] = useState('2.00');
  
  const [resultMult, setResultMult] = useState<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [winStatus, setWinStatus] = useState<'win'|'lose'|null>(null);

  // House edge 1%
  const winChance = Math.min(99, 99 / parseFloat(targetMultiplier || '1.01'));

  const generateCrashPoint = () => {
    const e = 2 ** 32;
    const h = crypto.getRandomValues(new Uint32Array(1))[0];
    const crash = Math.max(1, (100 * e - h) / (e - h) / 100);
    // Limbo specific edge logic
    return crash * 0.99; 
  };

  const handleBet = async () => {
    const bet = parseFloat(betAmount);
    const target = parseFloat(targetMultiplier);
    if (isNaN(bet) || bet <= 0 || bet > balance) return alert('Invalid bet or insufficient funds');
    if (isNaN(target) || target < 1.01) return alert('Target must be at least 1.01x');

    setIsRolling(true);
    setWinStatus(null);
    setResultMult(1.00);
    
    // Simulate tick up for suspense
    let ticks = 0;
    const interval = setInterval(() => {
      setResultMult(1 + Math.random() * target);
      ticks++;
    }, 40);

    try {
      const res = await fetch('/api/virtuals/limbo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ betAmount: bet, targetMultiplier: target })
      });
      const data = await res.json();
      
      clearInterval(interval);
      setIsRolling(false);
      
      if (!res.ok) throw new Error(data.error);

      setResultMult(data.resultMult);
      setWinStatus(data.isWin ? 'win' : 'lose');
      
    } catch (e: any) {
      clearInterval(interval);
      setIsRolling(false);
      alert(e.message || 'Failed to play Limbo securely');
    }
  };

  const controls = (
    <div className={controlStyles.controlPanel} style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }}>
       <div className={controlStyles.panelTabs}>
         <button className={controlStyles.panelTabActive}>Manual</button>
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
           
           <div style={{display: 'flex', gap: '1rem', marginTop: '1rem'}}>
             <div style={{flex: 1}}>
                <label style={{color: '#888', fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem'}}>Target Multiplier</label>
                <div className={controlStyles.stepper}>
                  <input type="number" value={targetMultiplier} onChange={e => setTargetMultiplier(e.target.value)} disabled={isRolling} />
                </div>
             </div>
             <div style={{flex: 1}}>
                <label style={{color: '#888', fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem'}}>Win Chance</label>
                <div className={controlStyles.stepper}>
                  <input type="text" value={`${winChance.toFixed(2)}%`} readOnly disabled />
                </div>
             </div>
           </div>
         </div>
         
         <div className={controlStyles.actionBtnContainer}>
           <button 
             className={`${controlStyles.actionBtn} ${controlStyles.btnBet}`} 
             onClick={handleBet}
             disabled={isRolling}
           >
              <span className={controlStyles.btnTitle}>{isRolling ? '...' : 'BET'}</span>
              {!isRolling && <span className={controlStyles.btnSub}>Win {(parseFloat(betAmount) * parseFloat(targetMultiplier || '1')).toFixed(2)} NGN</span>}
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
        "Enter a Target Multiplier (e.g. 2.00x, 1000.00x).",
        "The Win Chance calculates automatically based on your target.",
        "Click BET. The system will generate a random multiplier.",
        "If the generated multiplier is equal to or higher than your target, you win!"
      ]}
    >
      <div className={styles.container}>
        <div className={styles.mainDisplay}>
          <div className={`${styles.multiplierResult} ${winStatus === 'win' ? styles.resultWin : winStatus === 'lose' ? styles.resultLose : styles.resultNeutral}`}>
            {resultMult !== null ? resultMult.toFixed(2) : '1.00'}x
          </div>
          <div className={styles.targetLabel}>
            Target: <span className={styles.targetValue}>{parseFloat(targetMultiplier || '1.01').toFixed(2)}x</span>
          </div>
        </div>
      </div>
    </GameLayout>
  );
}
