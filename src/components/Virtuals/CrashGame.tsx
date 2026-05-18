'use client';

import { useState, useEffect, useRef } from 'react';
import { useWallet } from '@/context/WalletContext';
import styles from './CrashGame.module.css';
import { Plane, Flame, Volume2, VolumeX } from 'lucide-react';
import Scene from './Three/Scene';
import GameLayout from './Shared/GameLayout';
import { audioSystem } from '@/lib/audio';

interface Player {
  id: number | string;
  name: string;
  bet: number;
  cashedOutAt: number | null;
  winAmount: number | null;
}

interface GameState {
  status: 'betting' | 'playing' | 'crashed';
  multiplier: number;
  timeLeft: number;
  history: number[];
  players: Player[];
}

export default function CrashGame() {
  const { balance, deduct, deposit } = useWallet();
  const [gameState, setGameState] = useState<GameState>({ 
    status: 'betting', 
    multiplier: 1.0, 
    timeLeft: 5,
    history: [],
    players: []
  });
  const [isMuted, setIsMuted] = useState(false);
  
  // Panel 1 State
  const [bet1, setBet1] = useState<string>('10.00');
  const [activeBet1, setActiveBet1] = useState<number | null>(null);
  const [hasCashedOut1, setHasCashedOut1] = useState(false);
  const [win1, setWin1] = useState<number | null>(null);
  const [betId1, setBetId1] = useState<string | null>(null);
  const [autoCashout1, setAutoCashout1] = useState<string>(''); // empty means disabled
  const [isAuto1Enabled, setIsAuto1Enabled] = useState(false);

  // Panel 2 State
  const [bet2, setBet2] = useState<string>('20.00');
  const [activeBet2, setActiveBet2] = useState<number | null>(null);
  const [hasCashedOut2, setHasCashedOut2] = useState(false);
  const [win2, setWin2] = useState<number | null>(null);
  const [betId2, setBetId2] = useState<string | null>(null);
  const [autoCashout2, setAutoCashout2] = useState<string>('');
  const [isAuto2Enabled, setIsAuto2Enabled] = useState(false);

  // Refs for current state inside intervals
  const gameStateRef = useRef(gameState);
  const activeBet1Ref = useRef(activeBet1);
  const hasCashedOut1Ref = useRef(hasCashedOut1);
  const activeBet2Ref = useRef(activeBet2);
  const hasCashedOut2Ref = useRef(hasCashedOut2);
  const isAuto1EnabledRef = useRef(isAuto1Enabled);
  const autoCashout1Ref = useRef(autoCashout1);
  const isAuto2EnabledRef = useRef(isAuto2Enabled);
  const autoCashout2Ref = useRef(autoCashout2);

  useEffect(() => {
    gameStateRef.current = gameState;
    activeBet1Ref.current = activeBet1;
    hasCashedOut1Ref.current = hasCashedOut1;
    activeBet2Ref.current = activeBet2;
    hasCashedOut2Ref.current = hasCashedOut2;
    isAuto1EnabledRef.current = isAuto1Enabled;
    autoCashout1Ref.current = autoCashout1;
    isAuto2EnabledRef.current = isAuto2Enabled;
    autoCashout2Ref.current = autoCashout2;
  }, [gameState, activeBet1, hasCashedOut1, activeBet2, hasCashedOut2, isAuto1Enabled, autoCashout1, isAuto2Enabled, autoCashout2]);

  const handleCashout = async (panel: 1 | 2, exactTarget?: number) => {
    if (gameStateRef.current.status !== 'playing') return;
    
    const mult = exactTarget || gameStateRef.current.multiplier;

    if (panel === 1 && activeBet1Ref.current && !hasCashedOut1Ref.current && betId1) {
      setHasCashedOut1(true);
      const wonAmount = activeBet1Ref.current * mult;
      
      try {
        await fetch('/api/virtuals/crash/cashout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ betId: betId1, multiplier: mult, winAmount: wonAmount })
        });
        setWin1(wonAmount);
        audioSystem.playCashout();
      } catch (err) {
        console.error('Failed to cashout securely');
      }
    }

    if (panel === 2 && activeBet2Ref.current && !hasCashedOut2Ref.current && betId2) {
      setHasCashedOut2(true);
      const wonAmount = activeBet2Ref.current * mult;
      
      try {
        await fetch('/api/virtuals/crash/cashout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ betId: betId2, multiplier: mult, winAmount: wonAmount })
        });
        setWin2(wonAmount);
        audioSystem.playCashout();
      } catch (err) {
        console.error('Failed to cashout securely');
      }
    }
  };

  // Polling the API
  useEffect(() => {
    const interval = setInterval(async () => {
      try {
        const res = await fetch('/api/virtuals/crash');
        const data: GameState = await res.json();
        
        setGameState(prev => {
          if (prev.status === 'crashed' && data.status === 'betting') {
            setActiveBet1(null);
            setHasCashedOut1(false);
            setWin1(null);
            setBetId1(null);
            
            setActiveBet2(null);
            setHasCashedOut2(false);
            setWin2(null);
            setBetId2(null);
          } else if (prev.status === 'playing' && data.status === 'crashed') {
            audioSystem.playBomb();
          } else if (data.status === 'playing') {
            audioSystem.playAscend(data.multiplier);
          }
          return data;
        });

        // Auto Cashout Logic check within the polling cycle to ensure accuracy
        if (data.status === 'playing') {
           // Check Panel 1
           if (activeBet1Ref.current && !hasCashedOut1Ref.current && isAuto1EnabledRef.current) {
             const target = parseFloat(autoCashout1Ref.current);
             if (!isNaN(target) && data.multiplier >= target) {
                 handleCashout(1, target); // pass exact target for payout
             }
           }
           // Check Panel 2
           if (activeBet2Ref.current && !hasCashedOut2Ref.current && isAuto2EnabledRef.current) {
            const target = parseFloat(autoCashout2Ref.current);
            if (!isNaN(target) && data.multiplier >= target) {
                handleCashout(2, target); 
            }
          }
        }
      } catch (error) {
        console.error("Failed to fetch game state");
      }
    }, 500); // 500ms is smooth enough for display; 100ms was hammering the server with 10 calls/sec

    return () => clearInterval(interval);
  }, []);

  const handleBet = async (panel: 1 | 2) => {
    if (gameStateRef.current.status !== 'betting') return;
    
    const amountStr = panel === 1 ? bet1 : bet2;
    const amount = parseFloat(amountStr);
    
    if (amount > 0 && amount <= balance) {
      const roundId = (gameStateRef.current as any).roundId;
      if (!roundId) return;

      try {
        const res = await fetch('/api/virtuals/crash/bet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ betAmount: amount, roundId })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        audioSystem.init();
        if (panel === 1) { setActiveBet1(amount); setBetId1(data.betId); }
        if (panel === 2) { setActiveBet2(amount); setBetId2(data.betId); }
      } catch (err: any) {
        console.error('Failed to bet securely', err);
      }
    }
  };


  const setHalf = (panel: 1|2) => {
    if(panel === 1) setBet1(p => Math.max(1, parseFloat(p)/2).toFixed(2));
    if(panel === 2) setBet2(p => Math.max(1, parseFloat(p)/2).toFixed(2));
  };

  const setDouble = (panel: 1|2) => {
    if(panel === 1) setBet1(p => (parseFloat(p)*2).toFixed(2));
    if(panel === 2) setBet2(p => (parseFloat(p)*2).toFixed(2));
  };

  const setMax = (panel: 1|2) => {
    if(panel === 1) setBet1(balance.toFixed(2));
    if(panel === 2) setBet2(balance.toFixed(2));
  };

  const isBetting = gameState.status === 'betting';
  const isPlaying = gameState.status === 'playing';
  const isCrashed = gameState.status === 'crashed';

  const chartScale = Math.min(1, Math.max(0.1, 1 / gameState.multiplier));

  const formattedPlayers = gameState.players.map(p => ({
    id: p.id,
    name: p.name,
    bet: p.bet,
    multiplier: p.cashedOutAt,
    winAmount: p.winAmount,
    isMe: false
  }));

  if (activeBet1) {
    formattedPlayers.push({
      id: 'me1',
      name: 'You',
      bet: activeBet1,
      multiplier: hasCashedOut1 ? (win1! / activeBet1) : null,
      winAmount: win1,
      isMe: true
    });
  }
  
  if (activeBet2) {
    formattedPlayers.push({
      id: 'me2',
      name: 'You',
      bet: activeBet2,
      multiplier: hasCashedOut2 ? (win2! / activeBet2) : null,
      winAmount: win2,
      isMe: true
    });
  }

  const historyStrip = (
    <>
      {gameState.history.map((mult, i) => (
        <div key={i} className={`${styles.historyItem} ${mult >= 2 ? styles.historyHigh : styles.historyLow}`}>
          {mult.toFixed(2)}x
        </div>
      ))}
    </>
  );

  const controls = (
    <>
      {/* Panel 1 */}
      <div className={styles.controlPanel}>
         <div className={styles.panelTabs}>
           <button className={styles.panelTabActive}>Bet</button>
           <div className={styles.autoCashoutToggle} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
             <button 
               onClick={() => setIsMuted(audioSystem.toggleMute())}
               style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
             >
               {isMuted ? <VolumeX size={16} /> : <Volume2 size={16} />}
             </button>
             <label>Auto</label>
             <input type="checkbox" checked={isAuto1Enabled} onChange={e => setIsAuto1Enabled(e.target.checked)} />
           </div>
         </div>
         
         <div className={styles.panelBody}>
           <div className={styles.betAdjuster}>
             <div className={styles.stepper}>
               <button onClick={() => setBet1(p => Math.max(1, parseFloat(p)-1).toFixed(2))}>-</button>
               <input type="number" value={bet1} onChange={e => setBet1(e.target.value)} disabled={activeBet1 !== null} />
               <button onClick={() => setBet1(p => (parseFloat(p)+1).toFixed(2))}>+</button>
             </div>
             <div className={styles.quickBets}>
               <button onClick={() => setHalf(1)}>½</button>
               <button onClick={() => setDouble(1)}>2×</button>
               <button onClick={() => setMax(1)}>Max</button>
             </div>
             {isAuto1Enabled && (
               <div className={styles.autoTargetGroup}>
                 <span className={styles.autoTargetPrefix}>Cash out @</span>
                 <input 
                   type="number" 
                   value={autoCashout1} 
                   onChange={e => setAutoCashout1(e.target.value)} 
                   placeholder="2.00"
                   disabled={activeBet1 !== null}
                 />
                 <span className={styles.autoTargetSuffix}>x</span>
               </div>
             )}
           </div>

           <div className={styles.actionBtnContainer}>
             {activeBet1 && isPlaying && !hasCashedOut1 ? (
               <button className={`${styles.actionBtn} ${styles.btnCashout}`} onClick={() => handleCashout(1)}>
                 <span className={styles.btnTitle}>CASH OUT</span>
                 <span className={styles.btnSub}>{(activeBet1 * gameState.multiplier).toFixed(2)} NGN</span>
               </button>
             ) : (
               <button 
                 className={`${styles.actionBtn} ${activeBet1 ? styles.btnCancel : styles.btnBet}`}
                 onClick={activeBet1 ? () => setActiveBet1(null) : () => handleBet(1)}
                 disabled={(!isBetting && !activeBet1) || hasCashedOut1}
               >
                  <span className={styles.btnTitle}>
                    {activeBet1 ? (isBetting ? 'CANCEL' : 'WAITING...') : 'BET'}
                  </span>
                  {!activeBet1 && <span className={styles.btnSub}>{parseFloat(bet1).toFixed(2)} NGN</span>}
               </button>
             )}
           </div>
         </div>
      </div>

      {/* Panel 2 */}
      <div className={styles.controlPanel}>
         <div className={styles.panelTabs}>
           <button className={styles.panelTabActive}>Bet</button>
           <div className={styles.autoCashoutToggle}>
             <label>Auto</label>
             <input type="checkbox" checked={isAuto2Enabled} onChange={e => setIsAuto2Enabled(e.target.checked)} />
           </div>
         </div>
         
         <div className={styles.panelBody}>
           <div className={styles.betAdjuster}>
             <div className={styles.stepper}>
               <button onClick={() => setBet2(p => Math.max(1, parseFloat(p)-1).toFixed(2))}>-</button>
               <input type="number" value={bet2} onChange={e => setBet2(e.target.value)} disabled={activeBet2 !== null} />
               <button onClick={() => setBet2(p => (parseFloat(p)+1).toFixed(2))}>+</button>
             </div>
             <div className={styles.quickBets}>
               <button onClick={() => setHalf(2)}>½</button>
               <button onClick={() => setDouble(2)}>2×</button>
               <button onClick={() => setMax(2)}>Max</button>
             </div>
             {isAuto2Enabled && (
               <div className={styles.autoTargetGroup}>
                 <span className={styles.autoTargetPrefix}>Cash out @</span>
                 <input 
                   type="number" 
                   value={autoCashout2} 
                   onChange={e => setAutoCashout2(e.target.value)} 
                   placeholder="2.00"
                   disabled={activeBet2 !== null}
                 />
                 <span className={styles.autoTargetSuffix}>x</span>
               </div>
             )}
           </div>

           <div className={styles.actionBtnContainer}>
             {activeBet2 && isPlaying && !hasCashedOut2 ? (
               <button className={`${styles.actionBtn} ${styles.btnCashout}`} onClick={() => handleCashout(2)}>
                 <span className={styles.btnTitle}>CASH OUT</span>
                 <span className={styles.btnSub}>{(activeBet2 * gameState.multiplier).toFixed(2)} NGN</span>
               </button>
             ) : (
               <button 
                 className={`${styles.actionBtn} ${activeBet2 ? styles.btnCancel : styles.btnBet}`}
                 onClick={activeBet2 ? () => setActiveBet2(null) : () => handleBet(2)}
                 disabled={(!isBetting && !activeBet2) || hasCashedOut2}
               >
                  <span className={styles.btnTitle}>
                    {activeBet2 ? (isBetting ? 'CANCEL' : 'WAITING...') : 'BET'}
                  </span>
                  {!activeBet2 && <span className={styles.btnSub}>{parseFloat(bet2).toFixed(2)} NGN</span>}
               </button>
             )}
           </div>
         </div>
      </div>
    </>
  );

  return (
    <GameLayout 
      players={formattedPlayers} 
      controls={controls} 
      history={historyStrip}
      instructions={[
        "Enter your bet amount in one or both panels.",
        "Set an optional Auto Cashout multiplier.",
        "Click BET before the round starts.",
        "Watch the multiplier rise as the jet flies.",
        "Click CASH OUT to secure your winnings before the jet crashes!",
        "If the jet crashes before you cash out, you lose your bet."
      ]}
    >
      <div className={styles.canvasBg}>
        <Scene status={gameState.status} multiplier={gameState.multiplier} />
      </div>

      <div className={styles.overlayText}>
         {isBetting && (
            <div className={styles.waiting}>
              <div className={styles.propeller}></div>
              <h3>WAITING FOR NEXT ROUND</h3>
              <div className={styles.progressBar}>
                 <div className={styles.progressFill} style={{width: `${(gameState.timeLeft / 5) * 100}%`}}></div>
              </div>
            </div>
         )}

         {isPlaying && (
            <div className={styles.bigMultiplier}>
              {gameState.multiplier.toFixed(2)}x
            </div>
         )}

         {isCrashed && (
           <div className={styles.flewAway}>
             <h2 className={styles.crashAnimation}>CRASHED! <Flame className={styles.flameIcon}/></h2>
             <div className={styles.crashedMultiplier}>{gameState.multiplier.toFixed(2)}x</div>
           </div>
         )}
      </div>
    </GameLayout>
  );
}
