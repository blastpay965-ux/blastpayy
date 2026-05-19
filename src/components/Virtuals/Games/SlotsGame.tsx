'use client';

import React, { useState } from 'react';
import GameLayout from '../Shared/GameLayout';
import { useWallet } from '@/context/WalletContext';
import { useToast } from '@/context/ToastContext';
import styles from './SlotsGame.module.css';
import controlStyles from '../CrashGame.module.css';

const SYMBOLS = [
  { char: '🍒', payout: 5 },
  { char: '🍋', payout: 10 },
  { char: '🔔', payout: 20 },
  { char: '💎', payout: 50 },
  { char: '7️⃣', payout: 100 }
];

export default function SlotsGame() {
  const { balance, syncWallet, deductOptimistic } = useWallet();
  const { showError } = useToast();
  const [betAmount, setBetAmount] = useState('10.00');
  
  const [isSpinning, setIsSpinning] = useState(false);
  const [reels, setReels] = useState<string[]>(['7️⃣', '7️⃣', '7️⃣']);
  const [winStatus, setWinStatus] = useState<boolean | null>(null);
  const [payoutMult, setPayoutMult] = useState(0);

  const handleSpin = async () => {
    const bet = parseFloat(betAmount);
    if (isNaN(bet) || bet <= 0) return showError('Invalid bet amount.');
    if (bet > balance) return showError('Insufficient balance to spin.');

    setIsSpinning(true);
    deductOptimistic(bet);
    setWinStatus(null);
    setPayoutMult(0);

    try {
      const res = await fetch('/api/virtuals/slots', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ betAmount: bet })
      });
      const data = await res.json();

      // 2-second animation then show result
      setTimeout(async () => {
        setIsSpinning(false);
        if (!res.ok) { showError(data.error || 'Spin failed'); return; }
        setReels(data.reels);
        setPayoutMult(data.payoutMult);
        setWinStatus(data.isWin);
        await syncWallet();
      }, 2000);
    } catch (e: any) {
      setIsSpinning(false);
      showError(e.message || 'Failed to spin securely');
    }
  };

  const handleBetChange = (val: string) => {
    if (val === '' || /^\d*\.?\d*$/.test(val)) {
      setBetAmount(val);
    }
  };

  const safeParse = (val: string) => {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
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
             <button onClick={() => setBetAmount(p => Math.max(1, safeParse(p)-1).toFixed(2))} disabled={isSpinning}>-</button>
             <input 
               type="text" 
               inputMode="decimal"
               value={betAmount} 
               onChange={e => handleBetChange(e.target.value)} 
               disabled={isSpinning} 
             />
             <button onClick={() => setBetAmount(p => (safeParse(p)+1).toFixed(2))} disabled={isSpinning}>+</button>
           </div>
           <div className={controlStyles.quickBets}>
             <button onClick={() => setBetAmount(p => (safeParse(p)/2).toFixed(2))} disabled={isSpinning}>½</button>
             <button onClick={() => setBetAmount(p => (safeParse(p)*2).toFixed(2))} disabled={isSpinning}>2×</button>
             <button onClick={() => setBetAmount(balance.toFixed(2))} disabled={isSpinning}>Max</button>
           </div>
         </div>
         
         <div className={controlStyles.actionBtnContainer}>
           <button 
             className={`${controlStyles.actionBtn} ${controlStyles.btnBet}`} 
             onClick={handleSpin}
             disabled={isSpinning}
             style={{backgroundColor: '#fdd835', color: '#000'}}
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
        "Set your bet amount.",
        "Click SPIN to spin the slot machine reels.",
        "Match 3 identical symbols across the center line to win.",
        "Check the paytable for symbol payout multipliers."
      ]}
    >
      <div className={styles.container}>
        
        <div className={styles.machine}>
          
          <div className={styles.reelsContainer}>
            {reels.map((char, i) => (
              <div key={i} className={styles.reel}>
                <div className={isSpinning ? styles.spinning : ''}>
                  {isSpinning ? '🎰' : char}
                </div>
              </div>
            ))}
          </div>

          <div className={styles.paytable}>
            {SYMBOLS.map((s, i) => (
              <div key={i} className={styles.payItem}>
                <span className={styles.paySymbol}>{s.char}{s.char}{s.char}</span>
                <span className={styles.payMult}>{s.payout}x</span>
              </div>
            ))}
          </div>

        </div>

        {winStatus !== null && !isSpinning && (
          <div className={styles.gameEndOverlay}>
            <div className={winStatus ? styles.winText : styles.loseText}>
              {winStatus ? 'JACKPOT!' : 'NO WIN'}
            </div>
            {winStatus && (
              <div style={{color: '#fff', fontSize: '1.5rem', fontWeight: 'bold'}}>
                +{(parseFloat(betAmount) * payoutMult).toFixed(2)} NGN
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
