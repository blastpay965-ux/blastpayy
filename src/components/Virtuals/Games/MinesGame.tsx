'use client';

import React, { useState, useEffect } from 'react';
import GameLayout from '../Shared/GameLayout';
import { useWallet } from '@/context/WalletContext';
import styles from './MinesGame.module.css';
import controlStyles from '../CrashGame.module.css';
import { Diamond, Bomb, Volume2, VolumeX } from 'lucide-react';
import { audioSystem } from '@/lib/audio';

export default function MinesGame() {
  const { balance, deductBalance, addBalance } = useWallet();
  const [betAmount, setBetAmount] = useState('10.00');
  const [mineCount, setMineCount] = useState(3);
  
  const [isPlaying, setIsPlaying] = useState(false);
  const [grid, setGrid] = useState<boolean[]>(Array(25).fill(false)); // true = mine
  const [revealed, setRevealed] = useState<boolean[]>(Array(25).fill(false));
  const [gameOver, setGameOver] = useState(false);
  const [winStatus, setWinStatus] = useState<'win'|'lose'|null>(null);
  const [roundId, setRoundId] = useState<string | null>(null);
  
  const [multiplier, setMultiplier] = useState(1.00);
  const [gemsFound, setGemsFound] = useState(0);
  const [isMuted, setIsMuted] = useState(false);

  // Custom Live Admin House Edge
  const [adminMinesHouseEdge, setAdminMinesHouseEdge] = useState(5);

  useEffect(() => {
    // Fetch live configurations on mount
    fetch('/api/admin/config')
      .then(res => res.json())
      .then(data => {
        if (data && data.minesHouseEdge !== undefined) {
          setAdminMinesHouseEdge(data.minesHouseEdge);
        }
      })
      .catch(() => {});
  }, [isPlaying]);

  // Math for multiplier: combinations
  const calculateMultiplier = (mines: number, hits: number) => {
    // P(win) = (25-mines)! * (25-hits)! / (25! * (25-mines-hits)!)
    let p = 1.0;
    for (let i = 0; i < hits; i++) {
      p *= (25 - mines - i) / (25 - i);
    }
    const scaleFactor = 1 - (adminMinesHouseEdge / 100);
    return (1 / p) * scaleFactor;
  };

  const nextMultiplier = isPlaying ? calculateMultiplier(mineCount, gemsFound + 1) : calculateMultiplier(mineCount, 1);

  const startGame = async () => {
    const bet = parseFloat(betAmount);
    if (isNaN(bet) || bet <= 0 || bet > balance) return alert('Invalid bet or insufficient funds');

    audioSystem.init();
    
    try {
      const res = await fetch('/api/virtuals/mines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'start', betAmount: bet, mineCount })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setRoundId(data.roundId);
      setGrid(Array(25).fill(false));
      setRevealed(Array(25).fill(false));
      setIsPlaying(true);
      setGameOver(false);
      setWinStatus(null);
      setGemsFound(0);
      setMultiplier(1.00);
    } catch (e: any) {
      alert(e.message || 'Failed to start game securely');
    }
  };

  const handleTileClick = async (index: number) => {
    if (!isPlaying || gameOver || revealed[index] || !roundId) return;

    try {
      const res = await fetch('/api/virtuals/mines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'click', roundId, index })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      const newRevealed = [...revealed];
      newRevealed[index] = true;
      setRevealed(newRevealed);

      if (data.status === 'bomb') {
        setGrid(data.grid);
        setGameOver(true);
        setWinStatus('lose');
        setIsPlaying(false);
        audioSystem.playBomb();
        setRevealed(Array(25).fill(true));
      } else if (data.status === 'gem') {
        const newGems = gemsFound + 1;
        setGemsFound(newGems);
        setMultiplier(data.multiplier);
        audioSystem.playGem();

        if (newGems === 25 - mineCount) {
          handleCashout();
        }
      }
    } catch (e: any) {
      alert(e.message || 'Failed to process click securely');
    }
  };

  const handleCashout = async () => {
    if (!isPlaying || !roundId) return;
    
    try {
      const res = await fetch('/api/virtuals/mines', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cashout', roundId })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);

      setGrid(data.grid);
      setGameOver(true);
      setWinStatus('win');
      setIsPlaying(false);
      audioSystem.playCashout();
      setRevealed(Array(25).fill(true));
    } catch (e: any) {
      alert(e.message || 'Failed to cashout securely');
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
             <button onClick={() => setBetAmount(p => Math.max(1, parseFloat(p)-1).toFixed(2))} disabled={isPlaying}>-</button>
             <input type="number" value={betAmount} onChange={e => setBetAmount(e.target.value)} disabled={isPlaying} />
             <button onClick={() => setBetAmount(p => (parseFloat(p)+1).toFixed(2))} disabled={isPlaying}>+</button>
           </div>
           
           <label style={{color: '#888', fontSize: '0.8rem', display: 'block', margin: '0.75rem 0 0.25rem'}}>Mines (1-24)</label>
           <div className={controlStyles.stepper}>
             <button onClick={() => setMineCount(p => Math.max(1, p-1))} disabled={isPlaying}>-</button>
             <input type="number" value={mineCount} readOnly disabled={isPlaying} />
             <button onClick={() => setMineCount(p => Math.min(24, p+1))} disabled={isPlaying}>+</button>
           </div>
         </div>
         
         <div className={controlStyles.actionBtnContainer}>
           {isPlaying ? (
             <button className={`${controlStyles.actionBtn} ${controlStyles.btnCashout}`} onClick={() => handleCashout()}>
               <span className={controlStyles.btnTitle}>CASH OUT</span>
               <span className={controlStyles.btnSub}>{(parseFloat(betAmount) * multiplier).toFixed(2)} NGN</span>
             </button>
           ) : (
             <button className={`${controlStyles.actionBtn} ${controlStyles.btnBet}`} onClick={startGame}>
                <span className={controlStyles.btnTitle}>BET</span>
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
        "Select how many mines you want hidden on the board (1-24).",
        "Enter your bet amount and click BET.",
        "Click tiles on the 5x5 grid to reveal them.",
        "Revealing a Gem increases your multiplier.",
        "Revealing a Mine instantly busts your bet.",
        "Click CASH OUT at any time to secure your current multiplier."
      ]}
    >
      <div className={styles.container}>
        
        {isPlaying && (
          <div className={styles.multiplierDisplay} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              Current: {multiplier.toFixed(2)}x <span style={{color: '#888', fontSize: '0.9rem', marginLeft: '1rem'}}>Next: {nextMultiplier.toFixed(2)}x</span>
            </div>
            <button 
              onClick={() => setIsMuted(audioSystem.toggleMute())}
              style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
            >
              {isMuted ? <VolumeX size={20} /> : <Volume2 size={20} />}
            </button>
          </div>
        )}

        <div className={styles.grid}>
          {Array.from({length: 25}).map((_, i) => (
            <button 
              key={i} 
              className={`${styles.tile} ${revealed[i] ? styles.tileRevealed : ''}`}
              onClick={() => handleTileClick(i)}
              disabled={gameOver && !revealed[i]}
            >
              {revealed[i] ? (
                grid[i] ? <Bomb className={styles.tileMine} size={32} /> : <Diamond className={styles.tileGem} size={32} />
              ) : ''}
            </button>
          ))}
        </div>

        {gameOver && winStatus && (
          <div className={styles.gameEndOverlay}>
            <h2 className={winStatus === 'win' ? styles.winText : styles.loseText}>
              {winStatus === 'win' ? 'YOU WON!' : 'BUSTED!'}
            </h2>
            {winStatus === 'win' && (
              <p className={styles.winText} style={{fontSize: '1.2rem'}}>
                +{(parseFloat(betAmount) * multiplier).toFixed(2)} NGN
              </p>
            )}
            <button className="btn btn-primary" onClick={() => {setGameOver(false); setRevealed(Array(25).fill(false));}} style={{marginTop: '1rem'}}>
              Play Again
            </button>
          </div>
        )}
      </div>
    </GameLayout>
  );
}
