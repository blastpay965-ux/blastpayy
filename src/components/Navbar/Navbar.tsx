'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useWallet } from '@/context/WalletContext';
import { useAuth } from '@/context/AuthContext';
import { Menu, X, User, Wallet, Dices, Bomb, PlaneTakeoff, LogIn, Settings, Eye, EyeOff } from 'lucide-react';
import styles from './Navbar.module.css';
import WalletPanel from '@/components/Wallet/WalletPanel';
import Logo from '@/components/Logo/Logo';

export default function Navbar() {
  const pathname = usePathname();
  const { balance, isBalanceHidden, toggleHideBalance } = useWallet();
  const { user } = useAuth();
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  const handleLobbyClick = () => {
    setIsMobileMenuOpen(false);
    if (pathname === '/') {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  if (pathname && (pathname.startsWith('/admin') || pathname === '/login' || pathname === '/register')) {
    return null;
  }

  return (
    <>
      <header className={styles.header}>
        <div className={`container ${styles.navContainer}`}>
          <div className={styles.left}>
            <button 
              className={styles.mobileMenu}
              onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
              aria-label="Toggle Mobile Menu"
            >
              {isMobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
            <Link href="/" className={styles.logo} onClick={handleLobbyClick}>
              <Logo size={32} className={styles.logoSvg} />
              <span className={styles.logoText}>
                BLAST<span className={styles.logoAccent}>PAY</span>
              </span>
            </Link>
          </div>

          <div className={styles.right}>
            {!user ? (
              <div className={styles.authButtons}>
                 <Link href="/login" className="btn btn-login">Login</Link>
                 
              </div>
            ) : (
              <>
                <div className={styles.wallet}>
                  <div className={styles.balanceWrapper} onClick={() => setIsWalletOpen(true)} style={{cursor: 'pointer'}}>
                    <span className={styles.balance}>{isBalanceHidden ? '••••••' : balance.toFixed(2)} NGN</span>
                  </div>
                  <button 
                    type="button" 
                    className={styles.eyeToggleBtn}
                    onClick={toggleHideBalance}
                    title={isBalanceHidden ? "Show Balance" : "Hide Balance"}
                  >
                    {isBalanceHidden ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                  <button className={styles.depositBtn} onClick={() => setIsWalletOpen(true)}>Deposit</button>
                </div>
                
                <Link href="/profile" className={styles.userBtn}>
                  <User size={20} />
                </Link>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Dynamic Mobile Slide-down Menu Drawer */}
      {isMobileMenuOpen && (
        <div className={styles.mobileDrawer}>
          <nav className={styles.mobileNavLinks}>
            <Link 
              href="/" 
              className={styles.mobileNavLink}
              onClick={handleLobbyClick}
            >
              <Dices size={20} color="var(--accent-primary)" /> Lobby
            </Link>
          </nav>

          {/* Conditional Auth/Wallet rendering inside drawer */}
          <div className={styles.mobileAuthGroup}>
            {!user ? null : (
              <div className={styles.mobileWallet}>
                <div className={styles.mobileWalletHeader}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 700 }}>
                    NGN WALLET
                  </span>
                  <Wallet size={16} color="var(--accent-primary)" />
                </div>
                <div className={styles.mobileWalletBalance} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span>{isBalanceHidden ? '••••••' : balance.toFixed(2)} NGN</span>
                  <button 
                    type="button" 
                    onClick={toggleHideBalance}
                    style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem', display: 'flex', alignItems: 'center' }}
                  >
                    {isBalanceHidden ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
                <button 
                  className={styles.depositBtn}
                  style={{ width: '100%', padding: '0.75rem', fontSize: '0.95rem' }}
                  onClick={() => {
                    setIsMobileMenuOpen(false);
                    setIsWalletOpen(true);
                  }}
                >
                  Deposit Money
                </button>

                <div className={styles.mobileUserRow}>
                  <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Player: <strong>{user.username}</strong>
                  </span>
                  <Link 
                    href="/profile" 
                    className={styles.userBtn}
                    style={{ background: 'rgba(255,255,255,0.05)', padding: '0.5rem', borderRadius: '50%' }}
                    onClick={() => setIsMobileMenuOpen(false)}
                  >
                    <User size={18} />
                  </Link>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <WalletPanel isOpen={isWalletOpen} onClose={() => setIsWalletOpen(false)} />
    </>
  );
}
