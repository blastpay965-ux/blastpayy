import React, { ReactNode, useState } from 'react';
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

  return (
    <div className={styles.container}>
      {/* Left Sidebar: Live Bets */}
      <div className={styles.sidebar}>
        <div className={styles.sidebarHeader}>
          <button className={styles.sidebarTabActive}>All Bets</button>
          <button className={styles.sidebarTab}>My Bets</button>
          <button className={styles.sidebarTab}>Top</button>
        </div>
        
        <div className={styles.playersTable}>
          <div className={styles.tableHeader}>
            <span>Player</span>
            <span>Bet</span>
            <span>X</span>
            <span>Win</span>
          </div>
          <div className={styles.tableBody}>
            {players.map(p => (
              <div key={p.id} className={`${styles.tableRow} ${p.winAmount ? styles.rowWon : ''} ${p.isMe ? styles.myRow : ''}`}>
                <span className={styles.playerName}>
                  <div className={`${styles.avatar} ${p.isMe ? styles.myAvatar : ''}`}></div> {p.name}
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
