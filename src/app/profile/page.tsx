"use client";

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useWallet } from '@/context/WalletContext';
import styles from './page.module.css';
import { User, Wallet, History, Shield, LogOut, CheckCircle2, ShieldAlert, Key, Eye, EyeOff } from 'lucide-react';
import WalletPanel from '@/components/Wallet/WalletPanel';

export default function ProfilePage() {
  const { user, isLoading, logout } = useAuth();
  const { balance, transactions, isBalanceHidden, toggleHideBalance } = useWallet();
  const router = useRouter();
  
  const [activeTab, setActiveTab] = useState<'overview' | 'wallet' | 'history' | 'security'>('overview');
  const [isWalletOpen, setIsWalletOpen] = useState(false);
  const [walletTab, setWalletTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [pinChangeSuccess, setPinChangeSuccess] = useState(false);


  useEffect(() => {
    // Only redirect after session check is complete
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading) {
    return (
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ textAlign: 'center', color: '#fff' }}>
          <div style={{
            width: '48px', height: '48px', border: '3px solid #333',
            borderTop: '3px solid var(--accent-primary)', borderRadius: '50%',
            animation: 'spin 0.8s linear infinite', margin: '0 auto 1rem',
          }} />
          <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Loading profile...</p>
        </div>
      </div>
    );
  }

  if (!user) return null;

  const handleLogout = () => {
    logout();
    router.push('/');
  };

  return (
    <div className={styles.page}>
      <div className={`container ${styles.profileContainer}`}>
        
        {/* Sidebar Navigation */}
        <aside className={styles.sidebar}>
          <div className={styles.userCard}>
            <div className={styles.avatar}>
              <User size={40} color="#fff" />
            </div>
            <h2>{user.username}</h2>
            <span className={styles.accountNumber}>{user.accountNumber || 'GUEST-ACC'}</span>
            {user.isGuest && <span className={styles.guestBadge}>Guest Account</span>}
          </div>

          <nav className={styles.sideNav}>
            <button 
              className={`${styles.navItem} ${activeTab === 'overview' ? styles.active : ''}`}
              onClick={() => setActiveTab('overview')}
            >
              <User size={18}/> Overview
            </button>
            <button 
              className={`${styles.navItem} ${activeTab === 'wallet' ? styles.active : ''}`}
              onClick={() => setActiveTab('wallet')}
            >
              <Wallet size={18}/> Wallet & Limits
            </button>
            <button 
              className={`${styles.navItem} ${activeTab === 'history' ? styles.active : ''}`}
              onClick={() => setActiveTab('history')}
            >
              <History size={18}/> Betting History
            </button>
            <button 
              className={`${styles.navItem} ${activeTab === 'security' ? styles.active : ''}`}
              onClick={() => setActiveTab('security')}
            >
              <Shield size={18}/> Security
            </button>
            <button className={`${styles.navItem} ${styles.logoutBtn}`} onClick={handleLogout}>
              <LogOut size={18}/> Sign Out
            </button>
          </nav>
        </aside>

        {/* Main Dashboard Area */}
        <main className={styles.mainContent}>
          {activeTab === 'overview' && (
            <>
              <h1 className={styles.title}>Account Overview</h1>
              
              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <span className={styles.statLabel}>Available Balance</span>
                    <button 
                      type="button" 
                      onClick={toggleHideBalance}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem', display: 'flex', alignItems: 'center' }}
                      title={isBalanceHidden ? "Show Balance" : "Hide Balance"}
                    >
                      {isBalanceHidden ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  <div className={styles.statValue}>
                    {isBalanceHidden ? '••••••' : balance.toFixed(2)} <span className={styles.currency}>NGN</span>
                  </div>
                  <div className={styles.cardButtons}>
                    <button 
                      className="btn btn-primary" 
                      style={{ flex: 1 }}
                      onClick={() => {
                        setWalletTab('deposit');
                        setIsWalletOpen(true);
                      }}
                    >
                      Deposit
                    </button>
                    <button 
                      className="btn btn-secondary" 
                      style={{ flex: 1 }}
                      onClick={() => {
                        setWalletTab('withdraw');
                        setIsWalletOpen(true);
                      }}
                    >
                      Withdraw
                    </button>
                  </div>
                </div>

                <div className={styles.statCard}>
                  <span className={styles.statLabel}>VIP Rank</span>
                  <div className={styles.statValue} style={{color: 'var(--accent-primary)'}}>
                    Bronze Tier
                  </div>
                  <div style={{fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '1.25rem'}}>
                    Next Tier: Silver (25% progress)
                  </div>
                </div>
              </div>

              {/* Recent Activity — real transactions only */}
              <div className={styles.tableSection}>
                <div className={styles.sectionHeader}>
                  <h2>Recent Activity</h2>
                  <button className={styles.viewAll} onClick={() => setActiveTab('history')}>View All</button>
                </div>

                {transactions.length > 0 ? (
                  <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>Date</th>
                          <th>Amount</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.slice(0, 5).map((tx) => (
                          <tr key={tx.id}>
                            <td><span className={styles.gameTag}>{tx.type.toUpperCase()}</span></td>
                            <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{tx.date}</td>
                            <td className={tx.type === 'deposit' ? styles.winText : styles.loseText} style={{ fontWeight: 700 }}>
                              {tx.type === 'deposit' ? '+' : '-'}₦{tx.amount.toFixed(2)}
                            </td>
                            <td>
                              <span style={{ background: 'rgba(0,230,118,0.12)', color: '#00e676', padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>SUCCESS</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
                    <History size={40} style={{ opacity: 0.3, marginBottom: '1rem' }} />
                    <p style={{ fontSize: '0.9rem' }}>No activity yet. Place a bet or make a deposit to get started.</p>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'wallet' && (
            <>
              <h1 className={styles.title}>Wallet & Limits</h1>
              
              <div className={styles.statsGrid}>
                <div className={`${styles.statCard} ${styles.doubleSpan}`}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.25rem' }}>
                    <span className={styles.statLabel}>Available Balance</span>
                    <button 
                      type="button" 
                      onClick={toggleHideBalance}
                      style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', padding: '0.25rem', display: 'flex', alignItems: 'center' }}
                      title={isBalanceHidden ? "Show Balance" : "Hide Balance"}
                    >
                      {isBalanceHidden ? <EyeOff size={20} /> : <Eye size={20} />}
                    </button>
                  </div>
                  <div className={styles.largeValue}>
                    ₦{isBalanceHidden ? '••••••' : balance.toFixed(2)}
                  </div>
                  
                  <div className={styles.cardButtons}>
                    <button 
                      className="btn btn-primary"
                      style={{ flex: 1 }}
                      onClick={() => {
                        setWalletTab('deposit');
                        setIsWalletOpen(true);
                      }}
                    >
                      Instant Deposit
                    </button>
                    <button 
                      className="btn btn-secondary"
                      style={{ flex: 1 }}
                      onClick={() => {
                        setWalletTab('withdraw');
                        setIsWalletOpen(true);
                      }}
                    >
                      Instant Withdrawal
                    </button>
                  </div>
                </div>

                <div className={styles.statCard}>
                  <span className={styles.statLabel}>24h Payout Limits</span>
                  <div className={styles.statValue} style={{ fontSize: '1.5rem', color: 'var(--accent-primary)', marginTop: '0.5rem' }}>
                    ₦500,000.00
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '1rem' }}>
                    Level 1 verified threshold limits. Complete KYC to lift limits.
                  </div>
                </div>
              </div>

              {/* Transactions Ledger */}
              <div className={styles.tableSection}>
                <div className={styles.sectionHeader}>
                  <h2>Deposit & Withdrawal Ledger</h2>
                </div>
                
                <div className={styles.tableWrapper}>
                  {transactions.length > 0 ? (
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Transaction ID</th>
                          <th>Type</th>
                          <th>Amount (NGN)</th>
                          <th>Timestamp</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map((tx) => (
                          <tr key={tx.id}>
                            <td style={{ fontFamily: 'monospace', fontSize: '0.85rem' }}>{tx.id}</td>
                            <td>
                              <span 
                                className={styles.gameTag}
                                style={{
                                  backgroundColor: tx.type === 'deposit' ? 'rgba(0, 230, 118, 0.1)' : 'rgba(255, 77, 77, 0.1)',
                                  color: tx.type === 'deposit' ? 'var(--accent-primary)' : 'var(--accent-danger)'
                                }}
                              >
                                {tx.type.toUpperCase()}
                              </span>
                            </td>
                            <td className={tx.type === 'deposit' ? styles.winText : styles.loseText} style={{ fontWeight: 700 }}>
                              ₦{tx.amount.toFixed(2)}
                            </td>
                            <td>{tx.date}</td>
                            <td style={{ color: '#00e676', fontWeight: 700 }}>SUCCESSFUL</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div style={{ textAlign: 'center', padding: '3rem 1rem', color: 'var(--text-secondary)' }}>
                      No deposits or withdrawals recorded yet. Click <strong>Instant Deposit</strong> above to fund your wallet.
                    </div>
                  )}
                </div>
              </div>
            </>
          )}

          {activeTab === 'history' && (
            <>
              <h1 className={styles.title}>Betting History</h1>
              
              <div className={styles.tableSection}>
                <div className={styles.sectionHeader}>
                  <h2>All Provably Fair Game Rounds</h2>
                </div>

                {transactions.length > 0 ? (
                  <div className={styles.tableWrapper}>
                    <table className={styles.table}>
                      <thead>
                        <tr>
                          <th>Type</th>
                          <th>Date</th>
                          <th>Amount (NGN)</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {transactions.map((tx) => (
                          <tr key={tx.id}>
                            <td><span className={styles.gameTag}>{tx.type.toUpperCase()}</span></td>
                            <td style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>{tx.date}</td>
                            <td className={tx.type === 'deposit' ? styles.winText : styles.loseText} style={{ fontWeight: 700 }}>
                              {tx.type === 'deposit' ? '+' : '-'}₦{tx.amount.toFixed(2)}
                            </td>
                            <td>
                              <span style={{ background: 'rgba(0,230,118,0.12)', color: '#00e676', padding: '0.2rem 0.6rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>SUCCESS</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div style={{ textAlign: 'center', padding: '4rem 1rem', color: 'var(--text-secondary)' }}>
                    <History size={48} style={{ opacity: 0.2, marginBottom: '1rem' }} />
                    <p style={{ fontSize: '0.95rem', marginBottom: '0.5rem' }}>No game rounds yet.</p>
                    <p style={{ fontSize: '0.85rem' }}>Head to any game and place your first bet to see your history here.</p>
                  </div>
                )}
              </div>
            </>
          )}

          {activeTab === 'security' && (
            <>
              <h1 className={styles.title}>Security Controls</h1>
              
              <div className={styles.statsGrid}>
                <div className={styles.statCard}>
                  <span className={styles.statLabel}>Security Shield</span>
                  <div style={{ fontSize: '1.1rem', color: '#00e676', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <CheckCircle2 size={16} /> Active SSL & 2FA
                  </div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.75rem' }}>
                    All payout operations are encrypted using SHA-256 and verified through Flutterwave gateway.
                  </div>
                </div>
              </div>

              {/* Password resetting mock form */}
              <div className={styles.tableSection}>
                <div className={styles.sectionHeader}>
                  <h2>Change Password / Secret PIN</h2>
                </div>
                
                <form 
                  onSubmit={(e) => {
                    e.preventDefault();
                    setPinChangeSuccess(true);
                    setTimeout(() => setPinChangeSuccess(false), 4000);
                  }}
                  style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }}
                >
                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>
                      Current Password / PIN
                    </label>
                    <input 
                      type="password" 
                      defaultValue="••••"
                      style={{ width: '100%', background: 'rgba(0,0,0,0.2)', border: '1px solid var(--border-color)', color: '#fff', padding: '0.6rem 0.8rem', borderRadius: '4px' }} 
                      disabled
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'block', marginBottom: '0.35rem' }}>
                      New Password / PIN
                    </label>
                    <input 
                      type="password" 
                      placeholder="Enter new alphanumeric password"
                      style={{ width: '100%', background: 'rgba(0,0,0,0.4)', border: '1px solid var(--border-color)', color: '#fff', padding: '0.6rem 0.8rem', borderRadius: '4px' }} 
                      required
                    />
                  </div>

                  {pinChangeSuccess && (
                    <div style={{ color: '#00e676', fontSize: '0.85rem', fontWeight: 600 }}>
                      ✓ Your account password has been updated successfully!
                    </div>
                  )}

                  <button type="submit" className="btn btn-primary" style={{ alignSelf: 'flex-start', marginTop: '0.5rem' }}>
                    Save Credentials
                  </button>
                </form>
              </div>
            </>
          )}
        </main>

      </div>

      <WalletPanel isOpen={isWalletOpen} onClose={() => setIsWalletOpen(false)} initialTab={walletTab} />
    </div>
  );
}
