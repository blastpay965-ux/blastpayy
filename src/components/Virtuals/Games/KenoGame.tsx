'use client';

import React, { useState } from 'react';
import GameLayout from '../Shared/GameLayout';
import { useWallet } from '@/context/WalletContext';
import styles from './KenoGame.module.css';
import controlStyles from '../CrashGame.module.css';

const PAYTABLE = [
  { hits: 0, mult: 0 },
  { hits: 1, mult: 0 },
  { hits: 2, mult: 1.5 },
  { hits: 3, mult: 5 },
  { hits: 4, mult: 15 },
  { hits: 5, mult: 50 }
];

export default function KenoGame() {
  const { balance, deductBalance, addBalance } = useWallet();
  const [betAmount, setBetAmount] = useState('10.00');
  
  const [selectedNumbers, setSelectedNumbers] = useState<number[]>([]);
  const [drawnNumbers, setDrawnNumbers] = useState<number[]>([]);
  const [isDrawing, setIsDrawing] = useState(false);
  const [gameDone, setGameDone] = useState(false);
  const [winStatus, setWinStatus] = useState<boolean | null>(null);
  const [hitsCount, setHitsCount] = useState(0);

  const toggleNumber = (num: number) => {
    if (isDrawing || gameDone) return;
    if (selectedNumbers.includes(num)) {
      setSelectedNumbers(prev => prev.filter(n => n !== num));
    } else {
      if (selectedNumbers.length < 5) {
        setSelectedNumbers(prev => [...prev, num]);
      }
    }
  };

  const handleBet = async () => {
    if (selectedNumbers.length !== 5) return alert('Please select exactly 5 numbers');
    const bet = parseFloat(betAmount);
    if (isNaN(bet) || bet <= 0 || bet > balance) return alert('Invalid bet or insufficient funds');

    setIsDrawing(true);
    setGameDone(false);
    setWinStatus(null);
    setDrawnNumbers([]);
    setHitsCount(0);

    try {
      const res = await fetch('/api/virtuals/keno', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ betAmount: bet, selectedNumbers })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      // Animate drawn numbers one-by-one
      let step = 0;
      const interval = setInterval(() => {
        setDrawnNumbers(prev => [...prev, data.drawnNumbers[step]]);
        if (selectedNumbers.includes(data.drawnNumbers[step])) {
          setHitsCount(prev => prev + 1);
        }
        step++;
        if (step >= 10) {
          clearInterval(interval);
          setWinStatus(data.winAmount > 0);
          setGameDone(true);
          setIsDrawing(false);
        }
      }, 400);
    } catch (e: any) {
      setIsDrawing(false);
      alert(e.message || 'Failed to play Keno securely');
    }
  };

  const getTileClass = (num: number) => {
    const isSelected = selectedNumbers.includes(num);
    const isDrawn = drawnNumbers.includes(num);
    
    if (isSelected && isDrawn) return styles.hit;
    if (isDrawn) return styles.drawn;
    if (isSelected) return styles.selected;
    return '';
  };

  const currentMult = PAYTABLE.find(p => p.hits === hitsCount)?.mult || 0;

  const controls = (
    <div className={controlStyles.controlPanel} style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }}>
       <div className={controlStyles.panelTabs}>
         <button className={controlStyles.panelTabActive}>Bet</button>
       </div>
       <div className={controlStyles.panelBody}>
         
         <div style={{textAlign: 'center', marginBottom: '1rem', color: '#888'}}>
           Selected: <span style={{color: '#fff', fontWeight: 'bold'}}>{selectedNumbers.length} / 5</span>
         </div>

         <div className={controlStyles.betAdjuster}>
           <label style={{color: '#888', fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem'}}>Bet Amount</label>
           <div className={controlStyles.stepper}>
             <button onClick={() => setBetAmount(p => Math.max(1, parseFloat(p)-1).toFixed(2))} disabled={isDrawing}>-</button>
             <input type="number" value={betAmount} onChange={e => setBetAmount(e.target.value)} disabled={isDrawing} />
             <button onClick={() => setBetAmount(p => (parseFloat(p)+1).toFixed(2))} disabled={isDrawing}>+</button>
           </div>
           <div className={controlStyles.quickBets}>
             <button onClick={() => setBetAmount(p => (parseFloat(p)/2).toFixed(2))} disabled={isDrawing}>½</button>
             <button onClick={() => setBetAmount(p => (parseFloat(p)*2).toFixed(2))} disabled={isDrawing}>2×</button>
             <button onClick={() => setBetAmount(balance.toFixed(2))} disabled={isDrawing}>Max</button>
           </div>
         </div>
         
         <div className={controlStyles.actionBtnContainer}>
           <button 
             className={`${controlStyles.actionBtn} ${controlStyles.btnBet}`} 
             onClick={handleBet}
             disabled={isDrawing || selectedNumbers.length !== 5}
           >
              <span className={controlStyles.btnTitle}>{isDrawing ? 'DRAWING...' : 'BET'}</span>
           </button>
           {!isDrawing && selectedNumbers.length > 0 && (
             <button 
               className={controlStyles.actionBtn} 
               onClick={() => {setSelectedNumbers([]); setGameDone(false); setDrawnNumbers([]);}}
               style={{backgroundColor: '#333', marginTop: '0.5rem'}}
             >
               CLEAR
             </button>
           )}
         </div>
       </div>
    </div>
  );

  return (
    <GameLayout 
      players={[]} 
      controls={controls}
      instructions={[
        "Select exactly 5 numbers on the 40-number grid.",
        "Set your bet amount.",
        "Click BET. The system will rapidly draw 10 random winning numbers.",
        "Your payout depends on how many of your 5 numbers match the drawn numbers.",
        "Match 2 or more numbers to win a multiplier!"
      ]}
    >
      <div className={styles.container}>
        
        <div className={styles.paytable}>
          {PAYTABLE.map((p, i) => (
            <div key={i} className={`${styles.payItem} ${gameDone && hitsCount === p.hits ? styles.active : ''}`}>
              <span className={styles.payHits}>{p.hits} Hits</span>
              <span className={styles.payMult}>{p.mult}x</span>
            </div>
          ))}
        </div>

        <div className={styles.grid}>
          {Array.from({length: 40}).map((_, i) => {
            const num = i + 1;
            return (
              <button 
                key={num} 
                className={`${styles.numberTile} ${getTileClass(num)}`}
                onClick={() => toggleNumber(num)}
                disabled={isDrawing}
              >
                {num}
              </button>
            )
          })}
        </div>

        {gameDone && winStatus !== null && (
          <div className={styles.gameEndOverlay}>
            <div className={winStatus ? styles.winText : styles.loseText}>
              {hitsCount} HITS!
            </div>
            {winStatus && (
              <div style={{color: '#fff', fontSize: '1.5rem', fontWeight: 'bold'}}>
                +{(parseFloat(betAmount) * currentMult).toFixed(2)} NGN
              </div>
            )}
            <button className="btn btn-primary" onClick={() => {setGameDone(false); setDrawnNumbers([]); setHitsCount(0);}} style={{marginTop: '1rem'}}>
              Dismiss
            </button>
          </div>
        )}

      </div>
    </GameLayout>
  );
}
