'use client';

import React, { useState, useEffect, useRef } from 'react';
import GameLayout from '../Shared/GameLayout';
import { useWallet } from '@/context/WalletContext';
import styles from './MinesGame.module.css'; 
import controlStyles from '../CrashGame.module.css';
import { audioSystem } from '@/lib/audio';
import { Volume2, VolumeX } from 'lucide-react';

interface Ball {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  path: number[];
  targetIndex: number;
  step: number;
  multiplier: number;
  winAmount: number;
  isDead: boolean;
}

export default function PlinkoGame() {
  const { balance, deductBalance, addBalance } = useWallet();
  const [betAmount, setBetAmount] = useState('10.00');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [lastWin, setLastWin] = useState<{ mult: number, amount: number } | null>(null);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ballsRef = useRef<Ball[]>([]);
  const animationRef = useRef<number | null>(null);

  const rows = 12;
  const pegRadius = 4;
  const ballRadius = 6;
  
  const PADDING_TOP = 40;
  const ROW_SPACING = 30;
  const COL_SPACING = 35;
  const BUCKETS = [100, 25, 10, 5, 2, 0.5, 0.2, 0.5, 2, 5, 10, 25, 100];

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let width = canvas.width;
    let height = canvas.height;

    const drawBoard = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw Pegs (Triangle)
      ctx.fillStyle = '#ffffff';
      for (let row = 0; row < rows; row++) {
        const numPegs = row + 3; // start with 3 pegs at top
        for (let col = 0; col < numPegs; col++) {
          const x = (width / 2) + (col - (numPegs - 1) / 2) * COL_SPACING;
          const y = PADDING_TOP + row * ROW_SPACING;
          
          ctx.beginPath();
          ctx.arc(x, y, pegRadius, 0, Math.PI * 2);
          ctx.fill();
          ctx.shadowBlur = 5;
          ctx.shadowColor = '#fff';
        }
      }
      ctx.shadowBlur = 0;

      // Draw Buckets
      const bucketY = PADDING_TOP + rows * ROW_SPACING + 10;
      for (let i = 0; i < BUCKETS.length; i++) {
        const x = (width / 2) + (i - (BUCKETS.length - 1) / 2) * COL_SPACING;
        
        // Bucket background
        ctx.fillStyle = getBucketColor(BUCKETS[i]);
        ctx.fillRect(x - COL_SPACING/2 + 2, bucketY, COL_SPACING - 4, 25);
        
        // Bucket text
        ctx.fillStyle = '#000';
        ctx.font = 'bold 10px sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(`${BUCKETS[i]}x`, x, bucketY + 16);
      }
    };

    const getBucketColor = (mult: number) => {
      if (mult >= 100) return '#ff003c';
      if (mult >= 25) return '#ff4444';
      if (mult >= 10) return '#ff9100';
      if (mult >= 2) return '#00e676';
      if (mult >= 1) return '#00b0ff';
      return '#888888';
    };

    const updatePhysics = () => {
      const activeBalls = ballsRef.current.filter(b => !b.isDead);
      
      activeBalls.forEach(ball => {
        const currentRow = Math.floor((ball.y - PADDING_TOP) / ROW_SPACING);
        
        if (currentRow >= rows) {
           ball.isDead = true;
           setLastWin({ mult: ball.multiplier, amount: ball.winAmount });
           audioSystem.playCashout();
           addBalance(ball.winAmount);
           return;
        }

        ball.vy += 0.2; // gravity
        ball.y += ball.vy;
        ball.x += ball.vx;

        // Check peg collision for the current and next row
        const numPegs = currentRow + 3;
        for (let col = 0; col < numPegs; col++) {
          const pegX = (width / 2) + (col - (numPegs - 1) / 2) * COL_SPACING;
          const pegY = PADDING_TOP + currentRow * ROW_SPACING;
          
          const dx = ball.x - pegX;
          const dy = ball.y - pegY;
          const dist = Math.sqrt(dx * dx + dy * dy);
          
          if (dist < ballRadius + pegRadius && ball.vy > 0) {
            audioSystem.playTick();
            ball.vy = -ball.vy * 0.4;
            
            // Advance path step and push horizontally
            if (ball.step <= currentRow) {
              const direction = ball.path[ball.step] || (Math.random() > 0.5 ? 1 : -1);
              ball.vx = direction * 2.5;
              ball.step++;
            }
            
            ball.y = pegY - ballRadius - pegRadius - 1;
          }
        }
      });

      drawBoard();

      // Draw Balls
      activeBalls.forEach(ball => {
        ctx.fillStyle = '#ff0055';
        ctx.beginPath();
        ctx.arc(ball.x, ball.y, ballRadius, 0, Math.PI * 2);
        ctx.fill();
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#ff0055';
      });
      ctx.shadowBlur = 0;

      animationRef.current = requestAnimationFrame(updatePhysics);
    };

    updatePhysics();

    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, []);

  const dropBall = async () => {
    const bet = parseFloat(betAmount);
    if (isNaN(bet) || bet <= 0 || bet > balance) return alert('Invalid bet or insufficient funds');

    setIsPlaying(true);
    audioSystem.init();
    deductBalance(bet);

    try {
      const res = await fetch('/api/virtuals/plinko', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ betAmount: bet })
      });
      const data = await res.json();
      
      if (data.status === 'success') {
        const newBall: Ball = {
          id: Date.now(),
          x: (canvasRef.current?.width || 600) / 2 + (Math.random() * 4 - 2), // slightly randomized start
          y: PADDING_TOP - ROW_SPACING, 
          vx: 0,
          vy: 0,
          path: data.path,
          targetIndex: data.bucketIndex,
          step: 0,
          multiplier: data.multiplier,
          winAmount: data.winAmount,
          isDead: false
        };
        ballsRef.current.push(newBall);
      } else {
        alert(data.error);
        addBalance(bet); // refund
      }
    } catch(e) {
      addBalance(bet); // refund
    } finally {
      setIsPlaying(false);
    }
  };

  const controls = (
    <div className={controlStyles.controlPanel} style={{ width: '100%', maxWidth: '400px', margin: '0 auto' }}>
       <div className={controlStyles.panelTabs}>
         <button className={controlStyles.panelTabActive}>Bet</button>
         <button 
            onClick={() => setIsMuted(audioSystem.toggleMute())}
            style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}
          >
            {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
          </button>
       </div>
       <div className={controlStyles.panelBody}>
         <div className={controlStyles.betAdjuster}>
           <label style={{color: '#888', fontSize: '0.8rem', display: 'block', marginBottom: '0.25rem'}}>Bet Amount</label>
           <div className={controlStyles.stepper}>
             <button onClick={() => setBetAmount(p => Math.max(1, parseFloat(p)-1).toFixed(2))}>-</button>
             <input type="number" value={betAmount} onChange={e => setBetAmount(e.target.value)} />
             <button onClick={() => setBetAmount(p => (parseFloat(p)+1).toFixed(2))}>+</button>
           </div>
         </div>
         
         <div className={controlStyles.actionBtnContainer}>
            <button className={`${controlStyles.actionBtn} ${controlStyles.btnBet}`} onClick={dropBall} disabled={isPlaying}>
              <span className={controlStyles.btnTitle}>{isPlaying ? 'DROPPING...' : 'DROP BALL'}</span>
            </button>
         </div>

         {lastWin && (
           <div style={{ marginTop: '1rem', padding: '0.75rem', background: 'rgba(0,230,118,0.1)', border: '1px solid #00e676', borderRadius: '8px', textAlign: 'center' }}>
             <div style={{ color: '#00e676', fontSize: '0.85rem', fontWeight: 700 }}>LAST DROP WIN</div>
             <div style={{ color: '#fff', fontSize: '1.2rem', fontWeight: 900 }}>{lastWin.mult}x</div>
             <div style={{ color: '#00e676', fontSize: '0.9rem' }}>+{lastWin.amount.toFixed(2)} NGN</div>
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
        "Enter your bet amount and click DROP BALL.",
        "Watch the ball bounce down the peg board.",
        "The ball is drawn into a random bucket at the bottom.",
        "Your payout equals your bet multiplied by the bucket's value."
      ]}
    >
      <div className={styles.container} style={{ padding: 0, overflow: 'hidden' }}>
        <canvas 
          ref={canvasRef} 
          width={600} 
          height={500} 
          style={{ width: '100%', maxWidth: '600px', height: 'auto', display: 'block', margin: '0 auto', background: 'radial-gradient(circle at center, #1a0a2e 0%, #0d0614 100%)', borderRadius: '8px' }}
        />
      </div>
    </GameLayout>
  );
}
