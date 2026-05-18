'use client';

import React, { useState } from 'react';
import GameLayout from '../Shared/GameLayout';
import { useWallet } from '@/context/WalletContext';
import styles from './RouletteGame.module.css';
import controlStyles from '../CrashGame.module.css';

const RED_NUMBERS = [1,3,5,7,9,12,14,16,18,19,21,23,25,27,30,32,34,36];

type BetType = 'red' | 'black' | 'green' | 'even' | 'odd' | '1-18' | '19-36';

interface BetOption {
  id: BetType;
  label: string;
  payout: number;
  bgClass?: string;
}

const OPTIONS: BetOption[] = [
  { id: 'red', label: 'Red', payout: 2, bgClass: styles.redBg },
  { id: 'green', label: 'Zero (0)', payout: 14, bgClass: styles.greenBg },
  { id: 'black', label: 'Black', payout: 2, bgClass: styles.blackBg },
];

const OPTIONS_ROW_2: BetOption[] = [
  { id: 'even', label: 'Even', payout: 2 },
  { id: 'odd', label: 'Odd', payout: 2 },
];

const OPTIONS_ROW_3: BetOption[] = [
  { id: '1-18', label: '1 to 18', payout: 2 },
  { id: '19-36', label: '19 to 36', payout: 2 },
];

export default function RouletteGame() {
  const { balance, deductBalance, addBalance } = useWallet();
  const [betAmount, setBetAmount] = useState('10.00');
  const [selectedBet, setSelectedBet] = useState<BetType>('red');
  
  const [isSpinning, setIsSpinning] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [winStatus, setWinStatus] = useState<'win'|'lose'|null>(null);

  const getNumberColorClass = (num: number | null) => {
    if (num === null) return '';
    if (num === 0) return styles.green;
    return RED_NUMBERS.includes(num) ? styles.red : styles.black;
  };

  const handleBet = async () => {
    const bet = parseFloat(betAmount);
    if (isNaN(bet) || bet <= 0 || bet > balance) return alert('Invalid bet or insufficient funds');

    setIsSpinning(true);
    setWinStatus(null);
    setResult(null);
    
    try {
      const res = await fetch('/api/virtuals/roulette', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ betAmount: bet, selectedBet })
      });
      const data = await res.json();
      
      // Simulate spin delay for visual effect
      setTimeout(() => {
        setIsSpinning(false);
        if (!res.ok) { alert(data.error); return; }
        setResult(data.winningNumber);
        setWinStatus(data.isWin ? 'win' : 'lose');
      }, 2000);
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
             onClick={handleBet}
             disabled={isSpinning}
           >
              <span className={controlStyles.btnTitle}>{isSpinning ? 'SPINNING...' : 'SPIN'}</span>
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
        "Select your bet amount.",
        "Click on a betting option on the board (e.g., Red, Black, Even, Odd).",
        "Click SPIN to spin the European Roulette wheel.",
        "If the ball lands on a number matching your bet, you win the specified payout multiplier!"
      ]}
    >
      <div className={styles.container}>
        
        <div className={`${styles.wheelContainer} ${isSpinning ? styles.wheelSpinning : ''}`}>
          {result !== null && !isSpinning && (
            <div className={`${styles.wheelResult} ${getNumberColorClass(result)}`}>
              {result}
            </div>
          )}
        </div>

        <div className={styles.board}>
          <div className={styles.boardRow}>
            {OPTIONS.map(opt => (
              <button 
                key={opt.id} 
                className={`${styles.betOption} ${opt.bgClass || ''} ${selectedBet === opt.id ? styles.selected : ''}`}
                onClick={() => setSelectedBet(opt.id)}
                disabled={isSpinning}
              >
                <span>{opt.label}</span>
                <span className={styles.betPayout}>{opt.payout}x</span>
              </button>
            ))}
          </div>
          <div className={styles.boardRow}>
            {OPTIONS_ROW_2.map(opt => (
              <button 
                key={opt.id} 
                className={`${styles.betOption} ${selectedBet === opt.id ? styles.selected : ''}`}
                onClick={() => setSelectedBet(opt.id)}
                disabled={isSpinning}
              >
                <span>{opt.label}</span>
                <span className={styles.betPayout}>{opt.payout}x</span>
              </button>
            ))}
          </div>
          <div className={styles.boardRow}>
            {OPTIONS_ROW_3.map(opt => (
              <button 
                key={opt.id} 
                className={`${styles.betOption} ${selectedBet === opt.id ? styles.selected : ''}`}
                onClick={() => setSelectedBet(opt.id)}
                disabled={isSpinning}
              >
                <span>{opt.label}</span>
                <span className={styles.betPayout}>{opt.payout}x</span>
              </button>
            ))}
          </div>
        </div>

        {winStatus && (
          <div className={styles.gameEndOverlay}>
            <div className={winStatus === 'win' ? styles.winText : styles.loseText}>
              {winStatus === 'win' ? 'YOU WON!' : 'NO LUCK!'}
            </div>
            {winStatus === 'win' && (
              <div style={{color: '#fff'}}>
                +{(parseFloat(betAmount) * ([...OPTIONS, ...OPTIONS_ROW_2, ...OPTIONS_ROW_3].find(o => o.id === selectedBet)?.payout || 2)).toFixed(2)} NGN
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
