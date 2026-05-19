'use client';

import React, { useState } from 'react';
import GameLayout from '../Shared/GameLayout';
import { useWallet } from '@/context/WalletContext';
import { useToast } from '@/context/ToastContext';
import styles from './BaccaratGame.module.css';
import controlStyles from '../CrashGame.module.css';

const SUITS = ['♠', '♥', '♣', '♦'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

interface Card {
  suit: string;
  rank: string;
  value: number;
}

export default function BaccaratGame() {
  const { balance, deductBalance, addBalance } = useWallet();
  const { showError } = useToast();
  const [betAmount, setBetAmount] = useState('10.00');
  const [betType, setBetType] = useState<'player'|'banker'|'tie'>('player');
  
  const [isDealing, setIsDealing] = useState(false);
  const [playerCards, setPlayerCards] = useState<Card[]>([]);
  const [bankerCards, setBankerCards] = useState<Card[]>([]);
  const [winStatus, setWinStatus] = useState<'win'|'lose'|null>(null);
  const [gameResult, setGameResult] = useState<string | null>(null);
  const [winAmount, setWinAmount] = useState(0);

  const getRandomCard = (): Card => {
    const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
    const rankIndex = Math.floor(Math.random() * RANKS.length);
    const rank = RANKS[rankIndex];
    let value = 0;
    if (rank === 'A') value = 1;
    else if (['10', 'J', 'Q', 'K'].includes(rank)) value = 0;
    else value = parseInt(rank);
    
    return { suit, rank, value };
  };

  const calculateScore = (cards: Card[]) => {
    let score = 0;
    for (const card of cards) {
      score += card.value;
    }
    return score % 10;
  };

  const handleDeal = async () => {
    const bet = parseFloat(betAmount);
    if (isNaN(bet) || bet <= 0 || bet > balance) return showError('Invalid bet or insufficient funds');

    setIsDealing(true);
    setWinStatus(null);
    setGameResult(null);
    
    try {
      const res = await fetch('/api/virtuals/baccarat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ betAmount: bet, betOn: betType })
      });
      const data = await res.json();

      setTimeout(() => {
        setIsDealing(false);
        if (!res.ok) { showError(data.error); return; }

        setPlayerCards(data.playerHand);
        setBankerCards(data.bankerHand);
        setWinAmount(data.winAmount);

        if (data.outcome === 'tie') {
          setGameResult('TIE');
          if (betType !== 'tie') setWinStatus(null);
          else setWinStatus('win');
        } else {
          setGameResult(data.outcome.toUpperCase() + ' WINS');
          setWinStatus(data.outcome === betType ? 'win' : 'lose');
        }
      }, 1000);
    } catch (e: any) {
      setIsDealing(false);
      showError(e.message || 'Failed to deal securely');
    }
  };

  const pScore = calculateScore(playerCards);
  const bScore = calculateScore(bankerCards);

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
         
         <div className={styles.betOptions}>
           <button className={`${styles.betOption} ${betType === 'player' ? styles.selected : ''}`} onClick={() => setBetType('player')}>
             Player 2x
           </button>
           <button className={`${styles.betOption} ${betType === 'banker' ? styles.selected : ''}`} onClick={() => setBetType('banker')}>
             Banker 1.95x
           </button>
           <button className={`${styles.betOption} ${betType === 'tie' ? styles.selected : ''}`} onClick={() => setBetType('tie')}>
             Tie 8x
           </button>
         </div>

         <div className={controlStyles.betAdjuster}>
           <label style={{color: '#888', fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem'}}>Bet Amount</label>
           <div className={controlStyles.stepper}>
             <button onClick={() => setBetAmount(p => Math.max(1, safeParse(p)-1).toFixed(2))} disabled={isDealing}>-</button>
             <input type="text" inputMode="decimal" value={betAmount} onChange={e => handleBetChange(e.target.value)} disabled={isDealing} />
             <button onClick={() => setBetAmount(p => (safeParse(p)+1).toFixed(2))} disabled={isDealing}>+</button>
           </div>
           <div className={controlStyles.quickBets}>
             <button onClick={() => setBetAmount(p => (safeParse(p)/2).toFixed(2))} disabled={isDealing}>½</button>
             <button onClick={() => setBetAmount(p => (safeParse(p)*2).toFixed(2))} disabled={isDealing}>2×</button>
             <button onClick={() => setBetAmount(balance.toFixed(2))} disabled={isDealing}>Max</button>
           </div>
         </div>
         
         <div className={controlStyles.actionBtnContainer}>
           <button className={`${controlStyles.actionBtn} ${controlStyles.btnBet}`} onClick={handleDeal} disabled={isDealing}>
              <span className={controlStyles.btnTitle}>{isDealing ? 'DEALING...' : 'DEAL'}</span>
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
        "Select your bet target: Player (2x), Banker (1.95x), or Tie (8x).",
        "Set your bet amount and click DEAL.",
        "Two cards are dealt to both the Player and the Banker.",
        "Scores are calculated using Modulo-10 (e.g. 8 + 7 = 15 = 5). Face cards equal 0.",
        "The hand with the highest score wins.",
        "If you bet correctly, you win your multiplier!"
      ]}
    >
      <div className={styles.container}>
        
        {/* Banker */}
        <div className={styles.tableSection}>
          <div className={styles.label}>
            Banker <span className={styles.score}>{bankerCards.length > 0 ? bScore : ''}</span>
          </div>
          <div className={styles.cardsContainer}>
            {bankerCards.map((card, i) => (
              <div key={i} className={styles.playingCard}>
                <span className={card.suit === '♥' || card.suit === '♦' ? styles.cardRed : styles.cardBlack}>
                  <div className={styles.cardRank}>{card.rank}</div>
                  <div className={styles.cardSuit}>{card.suit}</div>
                </span>
              </div>
            ))}
            {bankerCards.length === 0 && (
               <>
                 <div className={`${styles.playingCard} ${styles.hiddenCard}`}></div>
                 <div className={`${styles.playingCard} ${styles.hiddenCard}`}></div>
               </>
            )}
          </div>
        </div>

        {/* Player */}
        <div className={styles.tableSection}>
          <div className={styles.label}>
            Player <span className={styles.score}>{playerCards.length > 0 ? pScore : ''}</span>
          </div>
          <div className={styles.cardsContainer}>
            {playerCards.map((card, i) => (
              <div key={i} className={styles.playingCard}>
                <span className={card.suit === '♥' || card.suit === '♦' ? styles.cardRed : styles.cardBlack}>
                  <div className={styles.cardRank}>{card.rank}</div>
                  <div className={styles.cardSuit}>{card.suit}</div>
                </span>
              </div>
            ))}
             {playerCards.length === 0 && (
               <>
                 <div className={`${styles.playingCard} ${styles.hiddenCard}`}></div>
                 <div className={`${styles.playingCard} ${styles.hiddenCard}`}></div>
               </>
            )}
          </div>
        </div>

        {gameResult && (
          <div className={styles.gameEndOverlay}>
            <div className={winStatus === 'win' ? styles.winText : winStatus === 'lose' ? styles.loseText : styles.tieText}>
              {gameResult}
            </div>
            {winStatus === 'win' && (
              <div style={{color: '#fff', fontSize: '1.2rem'}}>
                +{(parseFloat(betAmount) * (betType === 'tie' ? 8 : betType === 'banker' ? 1.95 : 2)).toFixed(2)} NGN
              </div>
            )}
            {!winStatus && gameResult === 'TIE' && (
              <div style={{color: '#fff', fontSize: '1.2rem'}}>
                Bet Returned
              </div>
            )}
            <button className="btn btn-primary" onClick={() => {setGameResult(null); setPlayerCards([]); setBankerCards([]);}} style={{marginTop: '1rem'}}>
              Play Again
            </button>
          </div>
        )}

      </div>
    </GameLayout>
  );
}
