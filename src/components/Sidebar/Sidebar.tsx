'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { 
  Gamepad2, 
  Bomb, 
  Dices, 
  CircleDot, 
  Target, 
  Zap, 
  Spade, 
  Coins, 
  Gem, 
  Sparkles,
  PlaneTakeoff,
  Menu,
  ChevronLeft
} from 'lucide-react';
import { useState, useEffect } from 'react';
import styles from './Sidebar.module.css';

const SIDEBAR_LINKS = [
  { href: '/', label: 'Lobby', icon: Gamepad2 },
  { href: '/virtuals', label: 'Crash', icon: PlaneTakeoff },
  { href: '/virtuals/mines', label: 'Mines', icon: Bomb },
  { href: '/virtuals/plinko', label: 'Plinko', icon: CircleDot },
  { href: '/virtuals/dice', label: 'Dice', icon: Dices },
  { href: '/virtuals/limbo', label: 'Limbo', icon: Target },
  { href: '/virtuals/hilo', label: 'HiLo', icon: Zap },
  { href: '/virtuals/roulette', label: 'Roulette', icon: CircleDot },
  { href: '/virtuals/blackjack', label: 'Blackjack', icon: Spade },
  { href: '/virtuals/baccarat', label: 'Baccarat', icon: Gem },
  { href: '/virtuals/slots', label: 'Slots', icon: Coins },
  { href: '/virtuals/keno', label: 'Keno', icon: Sparkles },
  { href: '/virtuals/wheel', label: 'Wheel', icon: Target },
];

export default function Sidebar() {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024);
      if (window.innerWidth < 1024) {
        setIsCollapsed(true);
      } else {
        setIsCollapsed(false);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  if (pathname && (pathname.startsWith('/admin') || pathname === '/login' || pathname === '/register')) {
    return null;
  }

  if (isMobile) return null; // We'll rely on the existing mobile menu drawer

  return (
    <aside className={`${styles.sidebar} ${isCollapsed ? styles.collapsed : ''}`}>
      <div className={styles.toggleContainer}>
        <button 
          className={styles.toggleBtn} 
          onClick={() => setIsCollapsed(!isCollapsed)}
          aria-label="Toggle Sidebar"
        >
          {isCollapsed ? <Menu size={20} /> : <ChevronLeft size={20} />}
        </button>
      </div>

      <div className={styles.sidebarContent}>
        <div className={styles.categoryTitle}>
          {!isCollapsed && <span>Casino Games</span>}
        </div>
        
        <nav className={styles.navLinks}>
          {SIDEBAR_LINKS.map((link) => {
            const Icon = link.icon;
            const isActive = pathname === link.href;
            
            return (
              <Link 
                key={link.href} 
                href={link.href}
                className={`${styles.navLink} ${isActive ? styles.active : ''}`}
                title={isCollapsed ? link.label : undefined}
              >
                <Icon size={20} className={styles.navIcon} />
                {!isCollapsed && <span className={styles.navLabel}>{link.label}</span>}
              </Link>
            );
          })}
        </nav>
      </div>
    </aside>
  );
}
