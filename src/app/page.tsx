import Link from 'next/link';
import { PlaneTakeoff, Bomb, Sparkles, Dices, TrendingUp, Layers, CircleDot, Landmark, Award, Coins, RefreshCw } from 'lucide-react';
import styles from './page.module.css';

const CATEGORIES = [
  {
    title: 'Casino Originals',
    games: [
      {
        id: 'aviator',
        title: 'Aviator Crash',
        tag: 'Hot',
        href: '/virtuals',
      },
      {
        id: 'mines',
        title: 'Mines',
        tag: 'Popular',
        href: '/virtuals/mines',
      },
      {
        id: 'plinko',
        title: 'Plinko',
        tag: 'Popular',
        href: '/virtuals/plinko',
      },
      {
        id: 'dice',
        title: 'Dice',
        tag: 'Classic',
        href: '/virtuals/dice',
      },
      {
        id: 'limbo',
        title: 'Limbo',
        tag: 'High Roller',
        href: '/virtuals/limbo',
      },
      {
        id: 'hilo',
        title: 'HiLo',
        tag: 'Fast',
        href: '/virtuals/hilo',
      }
    ]
  },
  {
    title: 'Live Casino',
    games: [
      {
        id: 'roulette',
        title: 'Roulette',
        tag: 'Live',
        href: '/virtuals/roulette',
      },
      {
        id: 'blackjack',
        title: 'Blackjack',
        tag: 'Live',
        href: '/virtuals/blackjack',
      },
      {
        id: 'baccarat',
        title: 'Baccarat',
        tag: 'Live',
        href: '/virtuals/baccarat',
      }
    ]
  },
  {
    title: 'Slots & Games',
    games: [
      {
        id: 'slots',
        title: 'Neon Slots',
        tag: 'Hot',
        href: '/virtuals/slots',
      },
      {
        id: 'keno',
        title: 'Keno',
        tag: 'New',
        href: '/virtuals/keno',
      },
      {
        id: 'wheel',
        title: 'Wheel',
        tag: 'Trending',
        href: '/virtuals/wheel',
      }
    ]
  }
];

function renderGameIllustration(gameId: string) {
  switch (gameId) {
    case 'aviator':
      return (
        <div className={styles.illustrationCard} style={{ background: 'linear-gradient(135deg, #160128 0%, #a2003c 100%)' }}>
          <svg viewBox="0 0 200 120" className={styles.illustrationSvg}>
            <defs>
              <linearGradient id="jetGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ff007f" />
                <stop offset="100%" stopColor="#ff0044" />
              </linearGradient>
              <linearGradient id="lineGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(255, 0, 85, 0)" />
                <stop offset="50%" stopColor="rgba(255, 64, 129, 0.4)" />
                <stop offset="100%" stopColor="#ff0055" />
              </linearGradient>
            </defs>
            <circle cx="100" cy="60" r="45" fill="none" stroke="rgba(255, 0, 85, 0.12)" strokeWidth="1.5" strokeDasharray="4 4" />
            <circle cx="100" cy="60" r="28" fill="none" stroke="rgba(255, 0, 85, 0.08)" strokeWidth="1" />
            <path d="M 30 100 Q 80 90 160 30" fill="none" stroke="url(#lineGrad)" strokeWidth="4" strokeLinecap="round" />
            <g transform="translate(150, 25) rotate(-35)">
              <path d="M-12 0 L6 -10 L15 0 L6 10 Z" fill="url(#jetGrad)" filter="drop-shadow(0 0 8px #ff0055)" />
              <path d="M0 -3 L12 0 L0 3 Z" fill="#fff" />
              <path d="M-10 0 L-20 -5 L-20 5 Z" fill="#ff9100" opacity="0.8" />
            </g>
            <circle cx="50" cy="85" r="2" fill="#ff0055" opacity="0.6" />
            <circle cx="90" cy="70" r="1.5" fill="#ff0055" opacity="0.4" />
            <circle cx="120" cy="50" r="2.5" fill="#ff0055" opacity="0.8" />
          </svg>
          <span className={styles.illustrationText} style={{ color: 'rgba(255, 61, 127, 0.7)' }}>CRASH JET</span>
        </div>
      );
    case 'blast-hero':
      return (
        <div className={styles.illustrationCard} style={{ background: 'linear-gradient(135deg, #010a18 0%, #0044ff 100%)' }}>
          <svg viewBox="0 0 200 120" className={styles.illustrationSvg}>
            <defs>
              <linearGradient id="heroGrad" x1="0%" y1="100%" x2="100%" y2="0%">
                <stop offset="0%" stopColor="rgba(0, 123, 255, 0)" />
                <stop offset="50%" stopColor="rgba(0, 123, 255, 0.4)" />
                <stop offset="100%" stopColor="#007bff" />
              </linearGradient>
            </defs>
            <path d="M 30 100 Q 80 90 160 30" fill="none" stroke="url(#heroGrad)" strokeWidth="6" strokeLinecap="round" filter="drop-shadow(0 0 8px #007bff)" />
            <text x="150" y="35" fontSize="30" filter="drop-shadow(0 0 10px #007bff)">🦸‍♂️</text>
          </svg>
          <span className={styles.illustrationText} style={{ color: 'rgba(0, 123, 255, 0.7)' }}>SUPERHERO</span>
        </div>
      );
    case 'mines':
      return (
        <div className={styles.illustrationCard} style={{ background: 'linear-gradient(135deg, #011815 0%, #00b0ff 100%)' }}>
          <svg viewBox="0 0 200 120" className={styles.illustrationSvg}>
            <defs>
              <linearGradient id="gemGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#00e676" />
                <stop offset="100%" stopColor="#00b0ff" />
              </linearGradient>
            </defs>
            <path d="M 100 15 L 180 55 L 100 95 L 20 55 Z" fill="rgba(0, 230, 118, 0.03)" stroke="rgba(0, 230, 118, 0.15)" strokeWidth="1.5" />
            <path d="M 60 35 L 140 75" stroke="rgba(0, 230, 118, 0.08)" strokeWidth="1" />
            <path d="M 140 35 L 60 75" stroke="rgba(0, 230, 118, 0.08)" strokeWidth="1" />
            <g transform="translate(100, 48)">
              <polygon points="0,-22 18,-10 18,10 0,22 -18,10 -18,-10" fill="url(#gemGrad)" filter="drop-shadow(0 0 10px #00e676)" />
              <polygon points="0,-22 6,-8 -6,-8" fill="#fff" opacity="0.5" />
              <polygon points="18,-10 6,-8 10,6" fill="rgba(255,255,255,0.15)" />
              <polygon points="-18,-10 -6,-8 -10,6" fill="rgba(0,0,0,0.15)" />
              <polygon points="0,22 10,6 -10,6" fill="rgba(0,0,0,0.25)" />
            </g>
            <path d="M 65 30 L 68 33 L 73 34 L 68 35 L 65 38 L 62 35 L 57 34 L 62 33 Z" fill="#fff" opacity="0.8" />
            <path d="M 135 65 L 137 68 L 141 69 L 137 70 L 135 73 L 133 70 L 129 69 L 133 68 Z" fill="#00b0ff" opacity="0.8" />
          </svg>
          <span className={styles.illustrationText} style={{ color: 'rgba(0, 230, 118, 0.7)' }}>GEM MINES</span>
        </div>
      );
    case 'plinko':
      return (
        <div className={styles.illustrationCard} style={{ background: 'linear-gradient(135deg, #07011d 0%, #8500c5 100%)' }}>
          <svg viewBox="0 0 200 120" className={styles.illustrationSvg}>
            <defs>
              <linearGradient id="plinkoBallGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#fff" />
                <stop offset="100%" stopColor="#e040fb" />
              </linearGradient>
            </defs>
            <circle cx="100" cy="20" r="2.5" fill="rgba(255,255,255,0.3)" />
            <circle cx="85" cy="40" r="2.5" fill="rgba(255,255,255,0.3)" />
            <circle cx="115" cy="40" r="2.5" fill="rgba(255,255,255,0.3)" />
            <circle cx="70" cy="60" r="2.5" fill="rgba(255,255,255,0.3)" />
            <circle cx="100" cy="60" r="2.5" fill="rgba(255,255,255,0.3)" />
            <circle cx="130" cy="60" r="2.5" fill="rgba(255,255,255,0.3)" />
            <circle cx="55" cy="80" r="2.5" fill="rgba(255,255,255,0.3)" />
            <circle cx="85" cy="80" r="2.5" fill="rgba(255,255,255,0.3)" />
            <circle cx="115" cy="80" r="2.5" fill="rgba(255,255,255,0.3)" />
            <circle cx="145" cy="80" r="2.5" fill="rgba(255,255,255,0.3)" />
            <rect x="50" y="102" width="18" height="10" rx="2" fill="#ff1744" stroke="rgba(255,255,255,0.15)" />
            <rect x="75" y="102" width="18" height="10" rx="2" fill="#ff9100" stroke="rgba(255,255,255,0.15)" />
            <rect x="100" y="102" width="18" height="10" rx="2" fill="#00e676" stroke="rgba(255,255,255,0.15)" />
            <rect x="125" y="102" width="18" height="10" rx="2" fill="#ff9100" stroke="rgba(255,255,255,0.15)" />
            <rect x="150" y="102" width="18" height="10" rx="2" fill="#ff1744" stroke="rgba(255,255,255,0.15)" />
            <g transform="translate(108, 48)">
              <circle cx="0" cy="0" r="6" fill="url(#plinkoBallGrad)" filter="drop-shadow(0 0 8px #e040fb)" />
            </g>
            <path d="M 100 20 L 115 40 L 108 48" fill="none" stroke="rgba(224, 64, 251, 0.3)" strokeWidth="2" strokeDasharray="3 3" />
          </svg>
          <span className={styles.illustrationText} style={{ color: 'rgba(224, 64, 251, 0.7)' }}>PLINKO BOARD</span>
        </div>
      );
    case 'dice':
      return (
        <div className={styles.illustrationCard} style={{ background: 'linear-gradient(135deg, #070125 0%, #1538ff 100%)' }}>
          <svg viewBox="0 0 200 120" className={styles.illustrationSvg}>
            <defs>
              <linearGradient id="diceGrad1" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#304ffe" />
                <stop offset="100%" stopColor="#651fff" />
              </linearGradient>
              <linearGradient id="diceGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ff3d00" />
                <stop offset="100%" stopColor="#d500f9" />
              </linearGradient>
            </defs>
            <g transform="translate(70, 60) rotate(15)">
              <polygon points="0,-18 16,-9 0,0 -16,-9" fill="rgba(255,255,255,0.15)" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
              <polygon points="-16,-9 0,0 0,18 -16,9" fill="url(#diceGrad1)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
              <polygon points="0,0 16,-9 16,9 0,18" fill="rgba(48, 79, 254, 0.6)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
              <circle cx="0" cy="-9" r="2.5" fill="#fff" />
              <circle cx="-8" cy="4" r="2" fill="#fff" opacity="0.9" />
              <circle cx="-8" cy="12" r="2" fill="#fff" opacity="0.9" />
              <circle cx="8" cy="4" r="2" fill="#fff" opacity="0.9" />
              <circle cx="8" cy="12" r="2" fill="#fff" opacity="0.9" />
            </g>
            <g transform="translate(130, 45) rotate(-25)">
              <polygon points="0,-15 13,-7 0,0 -13,-7" fill="rgba(255,255,255,0.2)" stroke="rgba(255,255,255,0.3)" strokeWidth="1" />
              <polygon points="-13,-7 0,0 0,15 -13,8" fill="url(#diceGrad2)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
              <polygon points="0,0 13,-7 13,8 0,15" fill="rgba(213, 0, 249, 0.6)" stroke="rgba(255,255,255,0.15)" strokeWidth="1" />
              <circle cx="-6" cy="-4" r="1.8" fill="#fff" />
              <circle cx="6" cy="-10" r="1.8" fill="#fff" />
              <circle cx="6" cy="10" r="1.8" fill="#fff" />
            </g>
          </svg>
          <span className={styles.illustrationText} style={{ color: 'rgba(83, 109, 254, 0.7)' }}>ROLL DICE</span>
        </div>
      );
    case 'limbo':
      return (
        <div className={styles.illustrationCard} style={{ background: 'linear-gradient(135deg, #01121d 0%, #0091ea 100%)' }}>
          <svg viewBox="0 0 200 120" className={styles.illustrationSvg}>
            <circle cx="100" cy="60" r="42" fill="none" stroke="rgba(0, 145, 234, 0.2)" strokeWidth="6" />
            <path d="M 64 84 A 42 42 0 1 1 136 84" fill="none" stroke="#00b0ff" strokeWidth="6" strokeLinecap="round" filter="drop-shadow(0 0 8px #00b0ff)" />
            <line x1="100" y1="60" x2="124" y2="36" stroke="#fff" strokeWidth="3" strokeLinecap="round" />
            <circle cx="100" cy="60" r="7" fill="#fff" />
            <text x="100" y="94" fontSize="12" fontWeight="900" fill="#fff" textAnchor="middle">1000x</text>
          </svg>
          <span className={styles.illustrationText} style={{ color: 'rgba(0, 176, 255, 0.7)' }}>LIMBO MULTIPLIER</span>
        </div>
      );
    case 'hilo':
      return (
        <div className={styles.illustrationCard} style={{ background: 'linear-gradient(135deg, #1c0101 0%, #b71c1c 100%)' }}>
          <svg viewBox="0 0 200 120" className={styles.illustrationSvg}>
            <g transform="translate(85, 60) rotate(-15)">
              <rect x="-20" y="-30" width="40" height="60" rx="3" fill="#fff" stroke="rgba(0,0,0,0.1)" />
              <path d="M 0 -8 C -4 -3 -8 0 -8 5 C -8 10 -3 11 0 7 C 3 11 8 10 8 5 C 8 0 4 -3 0 -8 Z" fill="#b71c1c" />
              <text x="-14" y="-20" fontSize="8" fontWeight="900" fill="#b71c1c">K</text>
            </g>
            <g transform="translate(120, 55) rotate(8)">
              <rect x="-20" y="-30" width="40" height="60" rx="3" fill="#fff" stroke="#ff1744" strokeWidth="1.5" filter="drop-shadow(0 0 8px rgba(255,23,68,0.3))" />
              <path d="M 0 -8 C -4 -3 -8 0 -8 5 C -8 10 -3 11 0 7 C 3 11 8 10 8 5 C 8 0 4 -3 0 -8 Z" fill="#ff1744" />
              <text x="-14" y="-20" fontSize="8" fontWeight="900" fill="#ff1744">A</text>
            </g>
          </svg>
          <span className={styles.illustrationText} style={{ color: 'rgba(255, 23, 68, 0.7)' }}>HI-LO CARDS</span>
        </div>
      );
    case 'roulette':
      return (
        <div className={styles.illustrationCard} style={{ background: 'linear-gradient(135deg, #1c0b00 0%, #e65100 100%)' }}>
          <svg viewBox="0 0 200 120" className={styles.illustrationSvg}>
            <defs>
              <radialGradient id="wheelGrad" cx="50%" cy="50%" r="50%">
                <stop offset="60%" stopColor="#120600" />
                <stop offset="100%" stopColor="#ffd600" />
              </radialGradient>
            </defs>
            <circle cx="100" cy="60" r="48" fill="url(#wheelGrad)" stroke="#ff6d00" strokeWidth="2" filter="drop-shadow(0 0 8px rgba(255, 109, 0, 0.4))" />
            <circle cx="100" cy="60" r="40" fill="none" stroke="rgba(255, 255, 255, 0.12)" strokeWidth="1" />
            <line x1="100" y1="12" x2="100" y2="108" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1" />
            <line x1="52" y1="60" x2="148" y2="60" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1" />
            <line x1="66" y1="26" x2="134" y2="94" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1" />
            <line x1="66" y1="94" x2="134" y2="26" stroke="rgba(255, 255, 255, 0.15)" strokeWidth="1" />
            <circle cx="100" cy="60" r="14" fill="#000" stroke="#ffd600" strokeWidth="1" />
            <circle cx="100" cy="60" r="5" fill="#ffd600" />
            <line x1="100" y1="60" x2="88" y2="48" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
            <line x1="100" y1="60" x2="112" y2="72" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
            <circle cx="80" cy="40" r="3.5" fill="#fff" filter="drop-shadow(0 0 5px #fff)" />
          </svg>
          <span className={styles.illustrationText} style={{ color: 'rgba(255, 145, 0, 0.7)' }}>ROULETTE WHEEL</span>
        </div>
      );
    case 'blackjack':
      return (
        <div className={styles.illustrationCard} style={{ background: 'linear-gradient(135deg, #011808 0%, #00a152 100%)' }}>
          <svg viewBox="0 0 200 120" className={styles.illustrationSvg}>
            <defs>
              <linearGradient id="cardGrad" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stopColor="#ffffff" />
                <stop offset="100%" stopColor="#eceff1" />
              </linearGradient>
            </defs>
            <g transform="translate(85, 60) rotate(-15)">
              <rect x="-22" y="-33" width="44" height="66" rx="3.5" fill="url(#cardGrad)" stroke="rgba(0,0,0,0.12)" strokeWidth="1" />
              <path d="M 0 -10 C -5 -4 -10 0 -10 6 C -10 12 -4 14 0 9 C 4 14 10 12 10 6 C 10 0 5 -4 0 -10 Z" fill="#263238" />
              <path d="M -3 10 L 3 10 L 0 5 Z" fill="#263238" />
              <text x="-16" y="-22" fontSize="9" fontWeight="900" fill="#263238">A</text>
            </g>
            <g transform="translate(120, 55) rotate(8)">
              <rect x="-22" y="-33" width="44" height="66" rx="3.5" fill="url(#cardGrad)" stroke="#ff1744" strokeWidth="1.5" filter="drop-shadow(0 0 8px rgba(255,23,68,0.3))" />
              <path d="M 0 -8 C -4 -14 -12 -12 -12 -5 C -12 2 -4 8 0 13 C 4 8 12 2 12 -5 C 12 -12 4 -14 0 -8 Z" fill="#ff1744" />
              <text x="-16" y="-22" fontSize="9" fontWeight="900" fill="#ff1744">J</text>
            </g>
          </svg>
          <span className={styles.illustrationText} style={{ color: 'rgba(185, 246, 202, 0.7)' }}>BLACKJACK 21</span>
        </div>
      );
    case 'baccarat':
      return (
        <div className={styles.illustrationCard} style={{ background: 'linear-gradient(135deg, #100122 0%, #6a1b9a 100%)' }}>
          <svg viewBox="0 0 200 120" className={styles.illustrationSvg}>
            <rect x="55" y="30" width="90" height="60" rx="6" fill="rgba(255,255,255,0.05)" stroke="#ea80fc" strokeWidth="1.5" strokeDasharray="3 3" />
            <circle cx="100" cy="60" r="22" fill="none" stroke="#ea80fc" strokeWidth="2" filter="drop-shadow(0 0 8px #ea80fc)" />
            <path d="M 100 46 L 105 55 L 115 57 L 107 64 L 110 74 L 100 68 L 90 74 L 93 64 L 85 57 L 95 55 Z" fill="#ea80fc" />
          </svg>
          <span className={styles.illustrationText} style={{ color: 'rgba(234, 128, 252, 0.7)' }}>BACCARAT VIP</span>
        </div>
      );
    case 'slots':
      return (
        <div className={styles.illustrationCard} style={{ background: 'linear-gradient(135deg, #1b0120 0%, #ad1457 100%)' }}>
          <svg viewBox="0 0 200 120" className={styles.illustrationSvg}>
            <defs>
              <linearGradient id="slotsGold" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#ffd600" />
                <stop offset="100%" stopColor="#ff6d00" />
              </linearGradient>
            </defs>
            <rect x="35" y="25" width="130" height="70" rx="8" fill="#150020" stroke="rgba(197, 17, 98, 0.4)" strokeWidth="2" />
            <line x1="78" y1="25" x2="78" y2="95" stroke="rgba(197, 17, 98, 0.2)" strokeWidth="1.5" />
            <line x1="122" y1="25" x2="122" y2="95" stroke="rgba(197, 17, 98, 0.2)" strokeWidth="1.5" />
            <circle cx="56" cy="55" r="6" fill="#ff1744" />
            <circle cx="63" cy="61" r="6" fill="#ff1744" />
            <path d="M 56 48 Q 66 40 64 55" fill="none" stroke="#00e676" strokeWidth="1.5" />
            <g transform="translate(100, 60)">
              <path d="M -10 -15 L 10 -15 L 0 13 Z" fill="none" stroke="#ffd600" strokeWidth="4.5" strokeLinejoin="round" filter="drop-shadow(0 0 10px #ff6d00)" />
              <path d="M -10 -15 L 10 -15 L 0 13 Z" fill="none" stroke="#fff" strokeWidth="1.5" strokeLinejoin="round" />
            </g>
            <g transform="translate(142, 55)">
              <circle cx="0" cy="0" r="9" fill="url(#slotsGold)" filter="drop-shadow(0 0 6px #ffd600)" />
              <circle cx="0" cy="0" r="6.5" fill="none" stroke="#fff" strokeWidth="0.8" opacity="0.4" />
              <text x="0" y="3" fontSize="8" fontWeight="900" fill="#fff" textAnchor="middle">$</text>
            </g>
          </svg>
          <span className={styles.illustrationText} style={{ color: 'rgba(255, 64, 129, 0.7)' }}>NEON SLOTS</span>
        </div>
      );
    case 'keno':
      return (
        <div className={styles.illustrationCard} style={{ background: 'linear-gradient(135deg, #01151a 0%, #00838f 100%)' }}>
          <svg viewBox="0 0 200 120" className={styles.illustrationSvg}>
            <circle cx="100" cy="60" r="32" fill="rgba(0,0,0,0.3)" stroke="#00e5ff" strokeWidth="1.5" strokeDasharray="3 3" />
            <g transform="translate(85, 45)">
              <circle cx="0" cy="0" r="10" fill="#00e5ff" filter="drop-shadow(0 0 6px #00e5ff)" />
              <text x="0" y="3" fontSize="8" fontWeight="900" fill="#000" textAnchor="middle">08</text>
            </g>
            <g transform="translate(118, 55)">
              <circle cx="0" cy="0" r="11" fill="#00e5ff" filter="drop-shadow(0 0 6px #00e5ff)" />
              <text x="0" y="3.5" fontSize="9" fontWeight="900" fill="#000" textAnchor="middle">24</text>
            </g>
            <g transform="translate(95, 78)">
              <circle cx="0" cy="0" r="10" fill="#00e5ff" filter="drop-shadow(0 0 6px #00e5ff)" />
              <text x="0" y="3" fontSize="8" fontWeight="900" fill="#000" textAnchor="middle">77</text>
            </g>
          </svg>
          <span className={styles.illustrationText} style={{ color: 'rgba(0, 229, 255, 0.7)' }}>KENO GRID</span>
        </div>
      );
    case 'wheel':
    default:
      return (
        <div className={styles.illustrationCard} style={{ background: 'linear-gradient(135deg, #070422 0%, #4527a0 100%)' }}>
          <svg viewBox="0 0 200 120" className={styles.illustrationSvg}>
            <circle cx="100" cy="60" r="42" fill="none" stroke="#b388ff" strokeWidth="2.5" filter="drop-shadow(0 0 8px #b388ff)" />
            <circle cx="100" cy="60" r="35" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1" />
            <line x1="100" y1="18" x2="100" y2="102" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
            <line x1="58" y1="60" x2="142" y2="60" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
            <line x1="71" y1="31" x2="129" y2="89" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
            <line x1="71" y1="89" x2="129" y2="31" stroke="rgba(255,255,255,0.2)" strokeWidth="1" />
            <circle cx="100" cy="60" r="10" fill="#000" stroke="#b388ff" strokeWidth="1.5" />
            <polygon points="100,10 95,22 105,22" fill="#fff" />
          </svg>
          <span className={styles.illustrationText} style={{ color: 'rgba(179, 136, 255, 0.7)' }}>LUCKY SPIN</span>
        </div>
      );
  }
}

export default function Home() {
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <div className={`container ${styles.heroContent}`}>
          <div className={styles.heroText}>
            <h1>Provably Fair <br/><span className={styles.highlight}>BlastPay Gaming.</span></h1>
            <p>Play our exclusive Aviator crash game and Mines. Fast NGN payouts, massive multipliers.</p>
          </div>
        </div>
      </section>

      {CATEGORIES.map(category => (
        <section key={category.title} className={`container ${styles.gamesSection}`}>
          <div className={styles.sectionHeader}>
            <h2>{category.title}</h2>
          </div>
          
          <div className={styles.grid}>
            {category.games.map(game => (
              <Link href={game.href} key={game.id} className={styles.gameCard}>
                <div className={styles.imageWrapper}>
                  <div className={styles.imageOverlay} />
                  {renderGameIllustration(game.id)}
                  <span className={styles.tag}>{game.tag}</span>
                </div>
                <div className={styles.gameInfo}>
                  <h3>{game.title}</h3>
                  <span className={styles.playText}>Play Now &rarr;</span>
                </div>
              </Link>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
