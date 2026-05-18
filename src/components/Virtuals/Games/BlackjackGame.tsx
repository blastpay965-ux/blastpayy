'use client';

import React, { useState } from 'react';
import GameLayout from '../Shared/GameLayout';
import { useWallet } from '@/context/WalletContext';
import styles from './BlackjackGame.module.css';
import controlStyles from '../CrashGame.module.css';

const SUITS = ['♠', '♥', '♣', '♦'];
const RANKS = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

interface Card {
  suit: string;
  rank: string;
  value: number;
  isHidden?: boolean;
}

export default function BlackjackGame() {
  const { balance, deductBalance, addBalance } = useWallet();
  const [betAmount, setBetAmount] = useState('10.00');
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [playerCards, setPlayerCards] = useState<Card[]>([]);
  const [dealerCards, setDealerCards] = useState<Card[]>([]);
  const [winStatus, setWinStatus] = useState<'win'|'lose'|'push'|null>(null);
  const [roundId, setRoundId] = useState<string | null>(null);
  const [winAmount, setWinAmount] = useState(0);

  const getRandomCard = (): Card => {
    const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
    const rankIndex = Math.floor(Math.random() * RANKS.length);
    const rank = RANKS[rankIndex];
    let value = 0;
    if (rank === 'A') value = 11;
    else if (['J', 'Q', 'K'].includes(rank)) value = 10;
    else value = parseInt(rank);
    
    return { suit, rank, value };
  };

  const calculateScore = (cards: Card[]) => {
    let score = 0;
    let aces = 0;
    for (const card of cards) {
      if (card.isHidden) continue;
      score += card.value;
      if (card.rank === 'A') aces += 1;
    }
    while (score > 21 && aces > 0) {
      score -= 10;
      aces -= 1;
    }
    return score;
  };

  const startGame = async () => {
    const bet = parseFloat(betAmount);
    if (isNaN(bet) || bet <= 0 || bet > balance) return alert('Invalid bet or insufficient funds');

    try {
      const res = await fetch('/api/virtuals/blackjack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', betAmount: bet })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setRoundId(data.roundId);
      setPlayerCards(data.playerHand);
      setDealerCards(data.dealerHand);
      setWinStatus(null);

      if (data.status === 'blackjack') {
        setWinStatus('win');
        setWinAmount(data.winAmount);
        setIsPlaying(false);
      } else {
        setIsPlaying(true);
      }
    } catch (e: any) { alert(e.message || 'Failed to deal'); }
  };

  const handleHit = async () => {
    if (!roundId) return;
    try {
      const res = await fetch('/api/virtuals/blackjack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'hit', roundId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setPlayerCards(data.playerHand);
      if (data.status === 'bust') {
        setDealerCards(data.dealerHand);
        setWinStatus('lose');
        setWinAmount(0);
        setIsPlaying(false);
      }
    } catch (e: any) { alert(e.message || 'Failed to hit'); }
  };

  const handleStand = async () => {
    if (!roundId) return;
    try {
      const res = await fetch('/api/virtuals/blackjack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'stand', roundId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setPlayerCards(data.playerHand);
      setDealerCards(data.dealerHand);
      setWinAmount(data.winAmount || 0);
      setWinStatus(data.status as 'win' | 'lose' | 'push');
      setIsPlaying(false);
    } catch (e: any) { alert(e.message || 'Failed to stand'); }
  };

  const pScore = calculateScore(playerCards);
  const dScore = calculateScore(dealerCards);

  const controls = (
    <div className={controlStyles.controlPanel} style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }}>
       <div className={controlStyles.panelTabs}>
         <button className={controlStyles.panelTabActive}>Bet</button>
       </div>
       <div className={controlStyles.panelBody}>
         <div className={controlStyles.betAdjuster}>
           <label style={{color: '#888', fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem'}}>Bet Amount</label>
           <div className={controlStyles.stepper}>
             <button onClick={() => setBetAmount(p => Math.max(1, parseFloat(p)-1).toFixed(2))} disabled={isPlaying}>-</button>
             <input type="number" value={betAmount} onChange={e => setBetAmount(e.target.value)} disabled={isPlaying} />
             <button onClick={() => setBetAmount(p => (parseFloat(p)+1).toFixed(2))} disabled={isPlaying}>+</button>
           </div>
           <div className={controlStyles.quickBets}>
             <button onClick={() => setBetAmount(p => (parseFloat(p)/2).toFixed(2))} disabled={isPlaying}>½</button>
             <button onClick={() => setBetAmount(p => (parseFloat(p)*2).toFixed(2))} disabled={isPlaying}>2×</button>
             <button onClick={() => setBetAmount(balance.toFixed(2))} disabled={isPlaying}>Max</button>
           </div>
         </div>
         
         <div className={controlStyles.actionBtnContainer}>
           {!isPlaying && (
             <button className={`${controlStyles.actionBtn} ${controlStyles.btnBet}`} onClick={startGame}>
                <span className={controlStyles.btnTitle}>DEAL</span>
             </button>
           )}
           {isPlaying && (
             <div style={{display: 'flex', gap: '0.5rem', width: '100%'}}>
               <button className={`${controlStyles.actionBtn}`} style={{backgroundColor: '#00e676'}} onClick={handleHit}>
                  <span className={controlStyles.btnTitle}>HIT</span>
               </button>
               <button className={`${controlStyles.actionBtn}`} style={{backgroundColor: '#ff9800'}} onClick={handleStand}>
                  <span className={controlStyles.btnTitle}>STAND</span>
               </button>
             </div>
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
        "Set your bet and click DEAL.",
        "You and the dealer each receive two cards (one dealer card is hidden).",
        "Click HIT to draw another card and increase your score.",
        "Click STAND to lock in your score.",
        "If your score exceeds 21, you bust and lose.",
        "The dealer must hit until they reach 17 or higher.",
        "Beat the dealer's score without busting to win 2x your bet. Ties return your bet."
      ]}
    >
      <div className={styles.container}>
        
        {/* Dealer */}
        <div className={styles.tableSection}>
          <div className={styles.label}>
            Dealer <span className={styles.score}>{dScore > 0 ? dScore : ''}</span>
          </div>
          <div className={styles.cardsContainer}>
            {dealerCards.map((card, i) => (
              <div key={i} className={`${styles.playingCard} ${card.isHidden ? styles.hiddenCard : ''}`}>
                <span className={card.suit === '♥' || card.suit === '♦' ? styles.cardRed : styles.cardBlack}>
                  <div className={styles.cardRank}>{card.rank}</div>
                  <div className={styles.cardSuit}>{card.suit}</div>
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Player */}
        <div className={styles.tableSection}>
          <div className={styles.label}>
            Player <span className={styles.score}>{pScore > 0 ? pScore : ''}</span>
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
          </div>
        </div>

        {winStatus && (
          <div className={styles.gameEndOverlay}>
            <div className={winStatus === 'win' ? styles.winText : winStatus === 'lose' ? styles.loseText : styles.pushText}>
              {winStatus === 'win' ? 'YOU WON!' : winStatus === 'lose' ? 'DEALER WINS!' : 'PUSH!'}
            </div>
            {winStatus === 'win' && (
              <div style={{color: '#fff', fontSize: '1.2rem'}}>
                +{(parseFloat(betAmount) * 2).toFixed(2)} NGN
              </div>
            )}
            {winStatus === 'push' && (
              <div style={{color: '#fff', fontSize: '1.2rem'}}>
                Bet Returned
              </div>
            )}
            <button className="btn btn-primary" onClick={() => {setWinStatus(null); setPlayerCards([]); setDealerCards([]);}} style={{marginTop: '1rem'}}>
              Play Again
            </button>
          </div>
        )}

      </div>
    </GameLayout>
  );
}
