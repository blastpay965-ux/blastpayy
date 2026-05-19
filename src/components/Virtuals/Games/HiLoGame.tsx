'use client';

import React, { useState } from 'react';
import GameLayout from '../Shared/GameLayout';
import { useWallet } from '@/context/WalletContext';
import { useToast } from '@/context/ToastContext';
import styles from './HiLoGame.module.css';
import controlStyles from '../CrashGame.module.css';
import { ArrowDown, ArrowUp } from 'lucide-react';

const SUITS = ['♠', '♥', '♣', '♦'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];
// Rank values: 2=2, A=14

interface Card {
  suit: string;
  rank: string;
  value: number;
}

export default function HiLoGame() {
  const { balance, deductBalance, addBalance } = useWallet();
  const { showError } = useToast();
  const [betAmount, setBetAmount] = useState('10.00');
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentCard, setCurrentCard] = useState<Card | null>(null);
  const [multiplier, setMultiplier] = useState(1.00);
  const [winStatus, setWinStatus] = useState<'win'|'lose'|null>(null);
  const [roundId, setRoundId] = useState<string | null>(null);

  const getRandomCard = (): Card => {
    const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
    const rankIndex = Math.floor(Math.random() * RANKS.length);
    return { suit, rank: RANKS[rankIndex], value: rankIndex + 2 };
  };

  const getPayouts = (cardValue: number) => {
    // Basic probability calculation with 5% house edge
    // Higher: cards greater than current
    const higherCards = 14 - cardValue;
    const lowerCards = cardValue - 2;
    
    // Max mult cap to avoid infinity
    const higherMult = higherCards > 0 ? (12.35 / higherCards) : 0;
    const lowerMult = lowerCards > 0 ? (12.35 / lowerCards) : 0;
    
    return { higherMult, lowerMult };
  };

  const startGame = async () => {
    const bet = parseFloat(betAmount);
    if (isNaN(bet) || bet <= 0 || bet > balance) return showError('Invalid bet or insufficient funds');

    try {
      const res = await fetch('/api/virtuals/hilo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', betAmount: bet })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setRoundId(data.roundId);
      setCurrentCard(data.card);
      setIsPlaying(true);
      setWinStatus(null);
      setMultiplier(1.00);
    } catch (e: any) { showError(e.message || 'Failed to start game'); }
  };

  const handleGuess = async (guess: 'higher' | 'lower') => {
    if (!isPlaying || !currentCard || !roundId) return;

    try {
      const res = await fetch('/api/virtuals/hilo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'guess', roundId, guess, currentCardValue: currentCard.value, multiplier })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setCurrentCard(data.card);
      if (data.status === 'bust') {
        setIsPlaying(false);
        setWinStatus('lose');
      } else {
        setMultiplier(data.multiplier);
      }
    } catch (e: any) { showError(e.message || 'Failed to process guess'); }
  };

  const handleCashout = async () => {
    if (!isPlaying || !roundId) return;

    try {
      const res = await fetch('/api/virtuals/hilo', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cashout', roundId, multiplier, betAmount })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setIsPlaying(false);
      setWinStatus('win');
    } catch (e: any) { showError(e.message || 'Failed to cashout'); }
  };

  const payouts = currentCard ? getPayouts(currentCard.value) : { higherMult: 0, lowerMult: 0 };

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
             <button onClick={() => setBetAmount(p => Math.max(1, safeParse(p)-1).toFixed(2))} disabled={isPlaying}>-</button>
             <input type="text" inputMode="decimal" value={betAmount} onChange={e => handleBetChange(e.target.value)} disabled={isPlaying} />
             <button onClick={() => setBetAmount(p => (safeParse(p)+1).toFixed(2))} disabled={isPlaying}>+</button>
           </div>
           <div className={controlStyles.quickBets}>
             <button onClick={() => setBetAmount(p => (safeParse(p)/2).toFixed(2))} disabled={isPlaying}>½</button>
             <button onClick={() => setBetAmount(p => (safeParse(p)*2).toFixed(2))} disabled={isPlaying}>2×</button>
             <button onClick={() => setBetAmount(balance.toFixed(2))} disabled={isPlaying}>Max</button>
           </div>
         </div>
         
         <div className={controlStyles.actionBtnContainer}>
           {isPlaying ? (
             <button className={`${controlStyles.actionBtn} ${controlStyles.btnCashout}`} onClick={handleCashout}>
               <span className={controlStyles.btnTitle}>CASH OUT</span>
               <span className={controlStyles.btnSub}>{(parseFloat(betAmount) * multiplier).toFixed(2)} NGN</span>
             </button>
           ) : (
             <button className={`${controlStyles.actionBtn} ${controlStyles.btnBet}`} onClick={startGame}>
                <span className={controlStyles.btnTitle}>BET</span>
             </button>
           )}
         </div>

         {isPlaying && (
           <div className={styles.actionRow}>
             <button 
               className={styles.hiloBtn} 
               onClick={() => handleGuess('higher')}
               disabled={payouts.higherMult === 0}
             >
               <ArrowUp size={24} />
               Higher
               <span className={styles.btnMult}>{payouts.higherMult.toFixed(2)}x</span>
             </button>
             <button 
               className={styles.hiloBtn} 
               onClick={() => handleGuess('lower')}
               disabled={payouts.lowerMult === 0}
             >
               <ArrowDown size={24} />
               Lower
               <span className={styles.btnMult}>{payouts.lowerMult.toFixed(2)}x</span>
             </button>
           </div>
         )}
       </div>
    </div>
  );

  return (
    <GameLayout 
      players={[]} 
      controls={controls}
      instructions={[
        "Set your bet and click BET to draw the first card.",
        "Guess if the next drawn card will be Higher or Lower.",
        "The payout multipliers change dynamically based on the current card.",
        "If you guess correctly, your total multiplier increases.",
        "If you guess wrong, you bust and lose your bet.",
        "You can CASH OUT at any time after a correct guess to secure your winnings."
      ]}
    >
      <div className={styles.container}>
        
        {isPlaying && (
          <div className={styles.multiplierDisplay}>
            Total Multiplier: {multiplier.toFixed(2)}x
          </div>
        )}

        <div className={styles.cardDisplay}>
          {currentCard ? (
            <div className={`${styles.playingCard} ${styles.newCard}`}>
              <span className={currentCard.suit === '♥' || currentCard.suit === '♦' ? styles.cardRed : styles.cardBlack}>
                <div className={styles.cardRank}>{currentCard.rank}</div>
                <div className={styles.cardSuit}>{currentCard.suit}</div>
              </span>
            </div>
          ) : (
            <div className={styles.playingCard} style={{ backgroundColor: '#2a2e38', border: '2px dashed #444', color: '#666' }}>
              ?
            </div>
          )}
        </div>

        {winStatus && (
          <div className={styles.gameEndOverlay}>
            {winStatus === 'win' ? (
              <>
                <div className={styles.winText}>YOU WON!</div>
                <div style={{color: '#fff', fontSize: '1.2rem'}}>+{(parseFloat(betAmount) * multiplier).toFixed(2)} NGN</div>
              </>
            ) : (
              <div className={styles.loseText}>BUSTED!</div>
            )}
          </div>
        )}

      </div>
    </GameLayout>
  );
}
