import React, { ReactNode, useState, useEffect, useMemo } from 'react';
import styles from './GameLayout.module.css';
import { Info } from 'lucide-react';

interface Player {
  id: number | string;
  name: string;
  bet: number;
  multiplier?: number | null;
  winAmount?: number | null;
  isMe?: boolean;
}

interface GameLayoutProps {
  children: ReactNode; // The main game canvas
  controls: ReactNode; // The betting controls
  history?: ReactNode; // The history strip at the top
  players: Player[];
  instructions?: string[]; // Array of instruction steps
}

export default function GameLayout({ children, controls, history, players, instructions }: GameLayoutProps) {
  const [showInfo, setShowInfo] = useState(false);
  const [activeTab, setActiveTab] = useState<'all'|'my'|'top'>('all');
  const [fakePlayers, setFakePlayers] = useState<Player[]>([]);

  useEffect(() => {
    // Generate initial fake players
    const names = ['Hidden', 'Alex***', 'CryptoKing', 'JohnD', 'BigWinner', 'Satoshi', 'Lucky77', 'Guest_991', 'Whale_X', 'RoobetPro'];
    const initialFakes: Player[] = Array.from({ length: 15 }).map((_, i) => {
      const betAmount = Math.floor(Math.random() * 50000) + 1000;
      const isWin = Math.random() > 0.6; // 40% chance of fake win
      const multiplier = isWin ? (Math.random() * 4) + 1.5 : null;
      return {
        id: `fake-${i}`,
        name: names[Math.floor(Math.random() * names.length)],
        bet: betAmount,
        multiplier: multiplier,
        winAmount: isWin && multiplier ? betAmount * multiplier : null,
        isMe: false
      };
    });
    setFakePlayers(initialFakes);

    // Simulate live betting by periodically updating random fake players
    const interval = setInterval(() => {
      setFakePlayers(current => {
        const newFakes = [...current];
        const numToUpdate = Math.floor(Math.random() * 3) + 1; // update 1-3 players at a time
        
        for (let j = 0; j < numToUpdate; j++) {
          const idx = Math.floor(Math.random() * newFakes.length);
          const betAmount = Math.floor(Math.random() * 50000) + 1000;
          const isWin = Math.random() > 0.6;
          const multiplier = isWin ? (Math.random() * 4) + 1.5 : null;
          
          newFakes[idx] = {
            ...newFakes[idx],
            name: names[Math.floor(Math.random() * names.length)],
            bet: betAmount,
            multiplier: multiplier,
            winAmount: isWin && multiplier ? betAmount * multiplier : null,
          };
        }
        return newFakes;
      });
    }, 2000);

    return () => clearInterval(interval);
  }, []);

  const displayedPlayers = useMemo(() => {
    const allPlayers = [...players, ...fakePlayers];
    
    if (activeTab === 'my') {
      return allPlayers.filter(p => p.isMe);
    }
    if (activeTab === 'top') {
      return [...allPlayers].sort((a, b) => (b.winAmount || 0) - (a.winAmount || 0)).slice(0, 20);
    }
    
    // 'all' tab: Sort by bet size
    return allPlayers.sort((a, b) => b.bet - a.bet).slice(0, 20);
  }, [players, fakePlayers, activeTab]);

  return (
    <div className={styles.container}>
      {/* Left Sidebar: Live Bets */}
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <button 
            className={activeTab === 'all' ? styles.sidebarTabActive : styles.sidebarTab}
            onClick={() => setActiveTab('all')}
          >All Bets</button>
          <button 
            className={activeTab === 'my' ? styles.sidebarTabActive : styles.sidebarTab}
            onClick={() => setActiveTab('my')}
          >My Bets</button>
          <button 
            className={activeTab === 'top' ? styles.sidebarTabActive : styles.sidebarTab}
            onClick={() => setActiveTab('top')}
          >Top</button>
        </div>
        
        <div className={styles.playersTable}>
          <div className={styles.tableHeader}>
            <span>Player</span>
            <span>Bet</span>
            <span>X</span>
            <span>Win</span>
          </div>
          <div className={styles.tableBody}>
            {displayedPlayers.length === 0 && <div style={{textAlign: 'center', padding: '2rem', color: '#666', fontSize: '0.85rem'}}>No bets found.</div>}
            {displayedPlayers.map((p, idx) => (
              <div key={`${p.id}-${idx}`} className={`${styles.tableRow} ${p.winAmount ? styles.rowWon : ''} ${p.isMe ? styles.myRow : ''}`}>
                <span className={styles.playerName}>
                  <img 
                    src={`https://api.dicebear.com/7.x/pixel-art/svg?seed=${p.name}`} 
                    alt="avatar" 
                    className={`${styles.avatar} ${p.isMe ? styles.myAvatar : ''}`} 
                  /> 
                  {p.name}
                </span>
                <span>{p.bet.toFixed(2)}</span>
                <span className={styles.playerMultiplier}>
                  {p.multiplier ? `${p.multiplier.toFixed(2)}x` : '-'}
                </span>
                <span className={styles.playerWin}>
                  {p.winAmount ? p.winAmount.toFixed(2) : '-'}
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Game Area */}
      <div className={styles.mainArea}>
        {history && <div className={styles.historyStrip}>{history}</div>}
        
        <div className={styles.canvasContainer}>
          {instructions && instructions.length > 0 && (
            <button className={styles.infoBtn} onClick={() => setShowInfo(true)} title="How to play">
              <Info size={16} />
            </button>
          )}

          {showInfo && instructions && (
            <div className={styles.instructionsModal}>
              <div className={styles.modalHeader}>
                <span className={styles.modalTitle}>How to Play</span>
                <button className={styles.closeBtn} onClick={() => setShowInfo(false)}>&times;</button>
              </div>
              <ol className={styles.instructionsList}>
                {instructions.map((inst, idx) => (
                  <li key={idx}>{inst}</li>
                ))}
              </ol>
            </div>
          )}

          {children}
        </div>

        <div className={styles.controlsArea}>
          {controls}
        </div>
      </div>
    </div>
  );
}
