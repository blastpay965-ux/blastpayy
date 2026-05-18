import React, { useState } from 'react';
import GameLayout from './GameLayout';
import { useWallet } from '@/context/WalletContext';
import styles from '../CrashGame.module.css';

interface MockGameProps {
  title: string;
  children: React.ReactNode;
}

export default function MockGame({ title, children }: MockGameProps) {
  const { balance, deductBalance, addBalance } = useWallet();
  const [betAmount, setBetAmount] = useState('10.00');
  const [isBetting, setIsBetting] = useState(false);
  const [result, setResult] = useState<string | null>(null);

  const mockPlayers = [
    { id: 1, name: 'Alex99', bet: 50, multiplier: null, winAmount: null },
    { id: 2, name: 'CryptoKing', bet: 120, multiplier: null, winAmount: null },
    { id: 3, name: 'Sarah_X', bet: 15, multiplier: null, winAmount: null }
  ];

  const handleSimulate = () => {
    const bet = parseFloat(betAmount);
    if (isNaN(bet) || bet <= 0 || bet > balance) {
      alert('Invalid bet amount or insufficient funds');
      return;
    }

    deductBalance(bet);
    setIsBetting(true);
    setResult(null);

    // Simulate a 3 second game
    setTimeout(() => {
      const won = Math.random() > 0.5;
      if (won) {
        const winMult = 1.5 + Math.random() * 2;
        const winAmt = bet * winMult;
        addBalance(winAmt);
        setResult(`WON! ${winMult.toFixed(2)}x (+${winAmt.toFixed(2)})`);
      } else {
        setResult(`LOST!`);
      }
      setIsBetting(false);
    }, 2000);
  };

  const controls = (
    <div className={styles.controlPanel} style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }}>
       <div className={styles.panelTabs}>
         <button className={styles.panelTabActive}>Bet on {title}</button>
       </div>
       <div className={styles.panelBody}>
         <div className={styles.betAdjuster}>
           <div className={styles.stepper}>
             <button onClick={() => setBetAmount(p => Math.max(1, parseFloat(p)-1).toFixed(2))}>-</button>
             <input type="number" value={betAmount} onChange={e => setBetAmount(e.target.value)} disabled={isBetting} />
             <button onClick={() => setBetAmount(p => (parseFloat(p)+1).toFixed(2))}>+</button>
           </div>
           <div className={styles.quickBets}>
             <button onClick={() => setBetAmount(p => (parseFloat(p)/2).toFixed(2))}>½</button>
             <button onClick={() => setBetAmount(p => (parseFloat(p)*2).toFixed(2))}>2×</button>
             <button onClick={() => setBetAmount(balance.toFixed(2))}>Max</button>
           </div>
         </div>
         <div className={styles.actionBtnContainer}>
           <button 
             className={`${styles.actionBtn} ${isBetting ? styles.btnCancel : styles.btnBet}`}
             onClick={handleSimulate}
             disabled={isBetting}
           >
              <span className={styles.btnTitle}>
                {isBetting ? 'PLAYING...' : 'SIMULATE BET'}
              </span>
           </button>
         </div>
         {result && (
           <div style={{ textAlign: 'center', marginTop: '1rem', fontWeight: 'bold', color: result.includes('WON') ? '#00e676' : '#ff4444' }}>
             {result}
           </div>
         )}
       </div>
    </div>
  );

  return (
    <div style={{ padding: '2rem 0' }}>
      <div className="container">
        <h1 style={{ marginBottom: '1rem', color: '#fff' }}>{title}</h1>
        <GameLayout players={mockPlayers} controls={controls}>
          <div style={{ position: 'relative', width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            {children}
            {isBetting && <div style={{ position: 'absolute', top: 20, left: 20, color: '#fff', zIndex: 10 }}>Game in progress...</div>}
          </div>
        </GameLayout>
      </div>
    </div>
  );
}
