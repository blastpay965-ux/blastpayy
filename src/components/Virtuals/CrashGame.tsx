'use client';

import { useState, useEffect, useRef } from 'react';
import { useWallet } from '@/context/WalletContext';
import { useToast } from '@/context/ToastContext';
import styles from './CrashGame.module.css';
import { Flame, Volume2, VolumeX } from 'lucide-react';
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
  const { balance, deduct, deposit, deductOptimistic } = useWallet();
  const { showError } = useToast();
  const [gameState, setGameState] = useState<GameState>({ 
    status: 'betting', 
    multiplier: 1.0, 
    timeLeft: 5,
    history: [],
    players: []
  });
  const [visualMultiplier, setVisualMultiplier] = useState(1.0);
  const [isMuted, setIsMuted] = useState(false);
  const [cashoutPopup, setCashoutPopup] = useState<{ amount: number, mult: number } | null>(null);
  
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
      setWin1(wonAmount);
      deposit(wonAmount); // Optimistic deposit
      
      try {
        await fetch('/api/virtuals/crash/cashout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ betId: betId1, multiplier: mult, winAmount: wonAmount })
        });
        audioSystem.playCashout();
        setCashoutPopup({ amount: wonAmount, mult });
        setTimeout(() => setCashoutPopup(null), 2500);
      } catch (err) {
        console.error('Failed to cashout securely');
        setHasCashedOut1(false);
        setWin1(null);
        deduct(wonAmount); // Revert optimistic deposit
      }
    }

    if (panel === 2 && activeBet2Ref.current && !hasCashedOut2Ref.current && betId2) {
      setHasCashedOut2(true);
      const wonAmount = activeBet2Ref.current * mult;
      setWin2(wonAmount);
      deposit(wonAmount); // Optimistic deposit
      
      try {
        await fetch('/api/virtuals/crash/cashout', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ betId: betId2, multiplier: mult, winAmount: wonAmount })
        });
        audioSystem.playCashout();
        setCashoutPopup({ amount: wonAmount, mult });
        setTimeout(() => setCashoutPopup(null), 2500);
      } catch (err) {
        console.error('Failed to cashout securely');
        setHasCashedOut2(false);
        setWin2(null);
        deduct(wonAmount); // Revert optimistic deposit
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
            setVisualMultiplier(1.0); // Reset visual immediately
          } else if (prev.status === 'playing' && data.status === 'crashed') {
            audioSystem.playBomb();
            setVisualMultiplier(data.multiplier); // Snap to crash value
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
    }, 500); // Poll server every 500ms

    return () => clearInterval(interval);
  }, []);

  // Smooth visual interpolation
  useEffect(() => {
    let animationFrameId: number;
    let lastTime = performance.now();

    const interpolate = (time: number) => {
      const delta = (time - lastTime) / 1000; // seconds
      lastTime = time;

      if (gameState.status === 'playing') {
        setVisualMultiplier(prev => {
          const target = gameState.multiplier;
          if (prev >= target) return prev;
          
          // Instead of exponential decay (which slows down and stutters),
          // we use a constant speed approach to catch up to the target smoothly.
          const diff = target - prev;
          if (diff <= 0) return prev;
          
          // Move towards target at a speed that bridges the gap in ~300ms
          const speed = diff / 0.3; 
          return Math.min(prev + (speed * delta), target);
        });
      } else if (gameState.status === 'crashed') {
         setVisualMultiplier(gameState.multiplier);
      } else {
         setVisualMultiplier(1.0);
      }

      animationFrameId = requestAnimationFrame(interpolate);
    };

    animationFrameId = requestAnimationFrame(interpolate);
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameState.status, gameState.multiplier]);

  const handleBet = async (panel: 1 | 2) => {
    if (gameStateRef.current.status !== 'betting') return;
    
    const amountStr = panel === 1 ? bet1 : bet2;
    const amount = parseFloat(amountStr);
    
    if (isNaN(amount) || amount <= 0) {
      return showError('Please enter a valid bet amount.');
    }
    
    if (amount > balance) {
      return showError('Insufficient balance to place bet.');
    }

    if (amount > 0 && amount <= balance) {
      const roundId = (gameStateRef.current as any).roundId;
      if (!roundId) return;

      // Optimistic UI update
      if (panel === 1) setActiveBet1(amount);
      if (panel === 2) setActiveBet2(amount);
      deductOptimistic(amount);
      
      try {
        const res = await fetch('/api/virtuals/crash/bet', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ betAmount: amount, roundId })
        });
        
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);

        audioSystem.init();
        if (panel === 1) setBetId1(data.betId);
        if (panel === 2) setBetId2(data.betId);
      } catch (err: any) {
        console.error('Failed to bet securely', err);
        showError(err.message || 'Failed to place bet.');
        // Revert optimistic update
        if (panel === 1) setActiveBet1(null);
        if (panel === 2) setActiveBet2(null);
      }
    }
  };


  const handleBetChange = (val: string, setter: React.Dispatch<React.SetStateAction<string>>) => {
    if (val === '' || /^\d*\.?\d*$/.test(val)) {
      setter(val);
    }
  };

  const safeParse = (val: string) => {
    const parsed = parseFloat(val);
    return isNaN(parsed) ? 0 : parsed;
  };

  const setHalf = (panel: 1|2) => {
    if(panel === 1) setBet1(p => Math.max(1, safeParse(p)/2).toFixed(2));
    if(panel === 2) setBet2(p => Math.max(1, safeParse(p)/2).toFixed(2));
  };

  const setDouble = (panel: 1|2) => {
    if(panel === 1) setBet1(p => (safeParse(p)*2).toFixed(2));
    if(panel === 2) setBet2(p => (safeParse(p)*2).toFixed(2));
  };

  const setMax = (panel: 1|2) => {
    if(panel === 1) setBet1(balance.toFixed(2));
    if(panel === 2) setBet2(balance.toFixed(2));
  };

  const isBetting = gameState.status === 'betting';
  const isPlaying = gameState.status === 'playing';
  const isCrashed = gameState.status === 'crashed';

  // Professional Aviator Curve Logic using interpolated multiplier
  // The plane flies up and right, but caps out at 75% width/height so it doesn't fly off screen.
  // The curve stretches to meet it smoothly.
  const displayMult = gameState.status === 'playing' ? visualMultiplier : gameState.multiplier;
  const progressX = Math.min(75, (displayMult - 1) * 20);
  const progressY = Math.min(80, Math.log10(displayMult) * 60);

  const formattedPlayers = (gameState.players || []).map(p => ({
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
               <button onClick={() => setBet1(p => Math.max(1, safeParse(p)-1).toFixed(2))}>-</button>
               <input 
                 type="text" 
                 inputMode="decimal"
                 value={bet1} 
                 onChange={e => handleBetChange(e.target.value, setBet1)} 
                 disabled={activeBet1 !== null} 
               />
               <button onClick={() => setBet1(p => (safeParse(p)+1).toFixed(2))}>+</button>
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
                   type="text" 
                   inputMode="decimal"
                   value={autoCashout1} 
                   onChange={e => handleBetChange(e.target.value, setAutoCashout1)} 
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
               <button onClick={() => setBet2(p => Math.max(1, safeParse(p)-1).toFixed(2))}>-</button>
               <input 
                 type="text" 
                 inputMode="decimal"
                 value={bet2} 
                 onChange={e => handleBetChange(e.target.value, setBet2)} 
                 disabled={activeBet2 !== null} 
               />
               <button onClick={() => setBet2(p => (safeParse(p)+1).toFixed(2))}>+</button>
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
                   type="text" 
                   inputMode="decimal"
                   value={autoCashout2} 
                   onChange={e => handleBetChange(e.target.value, setAutoCashout2)} 
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
      <div className={`${styles.canvasBg} ${isPlaying ? styles.canvasBgPlaying : ''}`}>
        {/* Professional 2D Aviator SVG */}
        {!isBetting && (
          <div style={{ position: 'absolute', inset: 0 }}>
            {/* Curve + fill */}
            <svg width="100%" height="100%" viewBox="0 0 100 100" preserveAspectRatio="none" style={{ position: 'absolute', bottom: 0 }}>
              <defs>
                <linearGradient id="redGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#dc3545" stopOpacity="0.35" />
                  <stop offset="100%" stopColor="#dc3545" stopOpacity="0.0" />
                </linearGradient>
              </defs>
              <path 
                d={`M 0 100 Q ${progressX * 0.4} ${100 - progressY * 0.1} ${progressX} ${100 - progressY} L ${progressX} 100 Z`}
                fill="url(#redGradient)"
              />
              <path 
                d={`M 0 100 Q ${progressX * 0.4} ${100 - progressY * 0.1} ${progressX} ${100 - progressY}`}
                stroke="#dc3545" 
                strokeWidth="0.5" 
                fill="none" 
                style={{ filter: 'drop-shadow(0 0 2px rgba(220,53,69,0.9))' }}
              />
            </svg>

            {/* Professional SVG Aircraft */}
            {(isPlaying || isCrashed) && (
              <div
                className={isCrashed ? styles.flyAwayAnim : ''}
                style={{
                  position: 'absolute',
                  left: `${progressX}%`,
                  bottom: `${progressY}%`,
                  transform: 'translate(-5%, 50%)',
                  transition: 'none',
                  zIndex: 20
                }}
              >
                <svg
                  width="120"
                  height="60"
                  viewBox="0 0 120 60"
                  className={styles.planeIcon}
                  style={{ overflow: 'visible' }}
                >
                  <defs>
                    {/* Flame gradient for exhaust */}
                    <radialGradient id="flameGrad" cx="50%" cy="50%" r="50%">
                      <stop offset="0%" stopColor="#fff" stopOpacity="0.9" />
                      <stop offset="30%" stopColor="#ffcc00" stopOpacity="0.9" />
                      <stop offset="70%" stopColor="#ff4400" stopOpacity="0.7" />
                      <stop offset="100%" stopColor="#ff0000" stopOpacity="0" />
                    </radialGradient>
                    <filter id="glow">
                      <feGaussianBlur stdDeviation="2" result="blur" />
                      <feMerge>
                        <feMergeNode in="blur"/>
                        <feMergeNode in="SourceGraphic"/>
                      </feMerge>
                    </filter>
                  </defs>

                  {/* === ENGINE EXHAUST FLAME (behind plane) === */}
                  <ellipse cx="-8" cy="30" rx="18" ry="6" fill="url(#flameGrad)" className={styles.flamePulse} />
                  <ellipse cx="-14" cy="30" rx="10" ry="3.5" fill="#ff6600" opacity="0.7" className={styles.flamePulse} />

                  {/* === FUSELAGE (main body) === */}
                  {/* Belly */}
                  <path d="M 10 32 Q 40 38 90 31 Q 100 30 105 28 L 103 26 Q 95 28 88 29 Q 40 36 10 30 Z" fill="#c8ccd4" />
                  {/* Top */}
                  <path d="M 10 30 Q 40 22 85 25 Q 96 26 103 26 L 100 24 Q 90 23 82 22 Q 40 19 10 27 Z" fill="#ebedf0" />
                  {/* Nose cone */}
                  <path d="M 100 24 Q 112 27 116 28 Q 112 30 100 30 Z" fill="#dc3545" />
                  {/* Red accent stripe */}
                  <path d="M 20 27 Q 60 24 95 26 L 95 27 Q 60 25 20 28 Z" fill="#dc3545" opacity="0.7"/>

                  {/* === COCKPIT WINDOW === */}
                  <ellipse cx="90" cy="26" rx="6" ry="4" fill="#60c8ff" opacity="0.9" />
                  <ellipse cx="90" cy="25.5" rx="4" ry="2.5" fill="#a8dfff" opacity="0.6" />

                  {/* === MAIN WING (below fuselage) === */}
                  <path d="M 55 30 L 45 52 L 75 38 L 80 30 Z" fill="#d1d5db" stroke="#b0b5bf" strokeWidth="0.5"/>
                  <path d="M 55 30 L 50 52 L 45 52 L 55 29 Z" fill="#dc3545" opacity="0.5"/>
                  {/* Wing highlight */}
                  <path d="M 58 30 L 50 48 L 72 37 Z" fill="#e8eaed" opacity="0.5"/>

                  {/* === TAIL VERTICAL FIN === */}
                  <path d="M 18 28 L 12 14 L 22 22 Z" fill="#d1d5db" stroke="#b0b5bf" strokeWidth="0.5"/>
                  <path d="M 18 28 L 13 16 L 16 16 L 20 26 Z" fill="#dc3545" opacity="0.5"/>

                  {/* === HORIZONTAL STABILIZERS === */}
                  <path d="M 20 29 L 10 36 L 22 32 Z" fill="#d1d5db" stroke="#b0b5bf" strokeWidth="0.5"/>
                  <path d="M 20 28 L 10 22 L 22 26 Z" fill="#d1d5db" stroke="#b0b5bf" strokeWidth="0.5"/>

                  {/* === ENGINE NACELLE (under wing) === */}
                  <ellipse cx="60" cy="35" rx="9" ry="3.5" fill="#9ca3af"/>
                  <ellipse cx="57" cy="35" rx="4" ry="3.5" fill="#6b7280"/>
                  <ellipse cx="57" cy="35" rx="2.5" ry="2.5" fill="#1f2937"/>

                  {/* Glow around entire plane */}
                  <ellipse cx="60" cy="29" rx="55" ry="15" fill="#dc3545" opacity="0.04" />
                </svg>
              </div>
            )}
          </div>
        )}
      </div>

      <div className={styles.overlayText}>
         {cashoutPopup && (
           <div className={styles.cashoutPopup}>
             <div className={styles.cashoutPopupTitle}>You Cashed Out!</div>
             <div className={styles.cashoutPopupMult}>{cashoutPopup.mult.toFixed(2)}x</div>
             <div className={styles.cashoutPopupAmount}>+ ₦{cashoutPopup.amount.toFixed(2)}</div>
           </div>
         )}

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
              {displayMult.toFixed(2)}x
            </div>
         )}

         {isCrashed && (
           <div className={styles.flewAway}>
             <h2 className={styles.crashAnimation}>FLEW AWAY!</h2>
             <div className={styles.crashedMultiplier}>{gameState.multiplier.toFixed(2)}x</div>
           </div>
         )}
      </div>
    </GameLayout>
  );
}
