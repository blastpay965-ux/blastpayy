'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useWallet } from '@/context/WalletContext';
import { useAuth } from '@/context/AuthContext';
import styles from './admin.module.css';
import { 
  TrendingUp, 
  ShieldAlert, 
  Sliders, 
  Users, 
  DollarSign, 
  Settings, 
  Check, 
  Loader2, 
  Info,
  Smartphone,
  Mail,
  Lock,
  Skull,
  Activity,
  Flame,
  Bomb,
  CreditCard,
  UserX,
  AlertTriangle,
  Shield,
  LogOut,
  Key,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';

export default function AdminDashboard() {
  const router = useRouter();
  const { balance, deposit, deduct, transactions } = useWallet();
  const { user, logout } = useAuth();

  // Security Gate Overlays State
  const [isPasscodeVerified, setIsPasscodeVerified] = useState(false);
  const [passcodeInput, setPasscodeInput] = useState('');
  const [passcodeError, setPasscodeError] = useState('');

  // Admin Config States
  const [crashHouseEdge, setCrashHouseEdge] = useState(5);
  const [crashMaxMultiplier, setCrashMaxMultiplier] = useState(100);
  const [minesHouseEdge, setMinesHouseEdge] = useState(5);
  const [plinkoHouseEdge, setPlinkoHouseEdge] = useState(5);
  const [isRigged, setIsRigged] = useState(false);
  const [plinkoRiggedBucket, setPlinkoRiggedBucket] = useState('');

  // Advanced Overrides State
  const [nextCrashMultiplier, setNextCrashMultiplier] = useState<string>('');
  const [activeNextCrash, setActiveNextCrash] = useState<number | null>(null);
  const [isMinesRiggedNextClick, setIsMinesRiggedNextClick] = useState<'bomb' | 'gem' | 'normal'>('normal');
  const [sandboxPaymentMode, setSandboxPaymentMode] = useState(true);
  const [globalRigOutcome, setGlobalRigOutcome] = useState<'win' | 'lose' | null>(null);
  const [logs, setLogs] = useState<any[]>([]);
  
  const [bannedUsers, setBannedUsers] = useState<string[]>([]);
  const [frozenUsers, setFrozenUsers] = useState<string[]>([]);
  const [allPlatformUsers, setAllPlatformUsers] = useState<any[]>([]);
  const [pendingTransfers, setPendingTransfers] = useState<any[]>([]);

  // Financial Growth Mock Stats
  const [totalDeposits, setTotalDeposits] = useState(0);
  const [totalWithdrawals, setTotalWithdrawals] = useState(0);
  const [activeUsers, setActiveUsers] = useState(0);
  const [growthPercent, setGrowthPercent] = useState(15.4);

  // Standard Liquidity & Float Engine Stats
  const [totalPlayerBalances, setTotalPlayerBalances] = useState(0);
  const [netCashFloat, setNetCashFloat] = useState(0);
  const [houseProfitDeficit, setHouseProfitDeficit] = useState(0);
  const [coverageRatio, setCoverageRatio] = useState(100);

  // Interaction UI states
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [showCreditModal, setShowCreditModal] = useState(false);
  const [creditAmount, setCreditAmount] = useState('5000.00');
  const [selectedUser, setSelectedUser] = useState<{ username: string; balance: number; isGuest: boolean } | null>(null);

  // Profit Withdrawal States
  const [showWithdrawProfitModal, setShowWithdrawProfitModal] = useState(false);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [withdrawBankCode, setWithdrawBankCode] = useState('044');
  const [withdrawAccountNumber, setWithdrawAccountNumber] = useState('');
  const [withdrawPin, setWithdrawPin] = useState('');
  const [withdrawError, setWithdrawError] = useState('');
  const [withdrawSuccess, setWithdrawSuccess] = useState('');
  const [isWithdrawing, setIsWithdrawing] = useState(false);

  // AI Auto-Settlement States
  const [aiAutoSettle, setAiAutoSettle] = useState(true);
  const [aiSettleDelayMs, setAiSettleDelayMs] = useState(8000);
  const [isAiConfigSaving, setIsAiConfigSaving] = useState(false);

  // Fetch current configs on mount
  const fetchConfigs = () => {
    const pin = typeof window !== 'undefined' ? sessionStorage.getItem('blastpay_admin_pin') : '';
    if (!pin) {
      setIsPasscodeVerified(false);
      setIsLoading(false);
      return;
    }

    fetch('/api/admin/config', {
      headers: { 'x-admin-pin': pin },
      cache: 'no-store'
    })
      .then(res => {
        if (res.status === 401) {
          setIsPasscodeVerified(false);
          sessionStorage.removeItem('blastpay_admin_pin');
          throw new Error('Unauthorized');
        }
        return res.json();
      })
      .then(data => {
        if (data) {
          setCrashHouseEdge(typeof data.crashHouseEdge === 'number' ? data.crashHouseEdge : 5);
          setCrashMaxMultiplier(typeof data.crashMaxMultiplier === 'number' ? data.crashMaxMultiplier : 100);
          setMinesHouseEdge(typeof data.minesHouseEdge === 'number' ? data.minesHouseEdge : 5);
          setPlinkoHouseEdge(typeof data.plinkoHouseEdge === 'number' ? data.plinkoHouseEdge : 5);
          setIsRigged(!!data.isRigged);
          setPlinkoRiggedBucket(data.plinkoRiggedBucket || '');
          setActiveNextCrash(data.nextCrashMultiplier !== undefined ? data.nextCrashMultiplier : null);
          setIsMinesRiggedNextClick(data.isMinesRiggedNextClick || 'normal');
          setSandboxPaymentMode(typeof data.sandboxPaymentMode === 'boolean' ? data.sandboxPaymentMode : true);
          setBannedUsers(data.bannedUsers || []);
          setFrozenUsers(data.frozenUsers || []);
          setTotalDeposits(data.totalDeposits || 0);
          setTotalWithdrawals(data.totalWithdrawals || 0);
          setActiveUsers(data.activeUsersCount || 0);
          setGrowthPercent(data.simulatedGrowth || 0);
          setAllPlatformUsers(data.usersList || []);
          setGlobalRigOutcome(data.globalRigOutcome || null);
          setTotalPlayerBalances(data.totalPlayerBalances || 0);
          setNetCashFloat(data.netCashFloat || 0);
          setHouseProfitDeficit(data.houseProfitDeficit !== undefined ? data.houseProfitDeficit : 0);
          setCoverageRatio(data.coverageRatio !== undefined ? data.coverageRatio : 100);
          setPendingTransfers(data.pendingTransfers || []);
          setIsPasscodeVerified(true);
        }
        setIsLoading(false);
      })
      .catch(() => setIsLoading(false));
  };

  const fetchAiConfig = () => {
    const pin = typeof window !== 'undefined' ? sessionStorage.getItem('blastpay_admin_pin') : '';
    if (!pin) return;

    fetch('/api/admin/ai-config', {
      headers: { 'x-admin-pin': pin },
      cache: 'no-store'
    })
      .then(res => {
        if (res.ok) return res.json();
      })
      .then(data => {
        if (data) {
          setAiAutoSettle(!!data.aiAutoSettle);
          setAiSettleDelayMs(Number(data.aiSettleDelayMs) || 8000);
        }
      })
      .catch(() => {});
  };

  const handleSaveAiConfig = async (updatedSettle: boolean, updatedDelay: number) => {
    const pin = typeof window !== 'undefined' ? sessionStorage.getItem('blastpay_admin_pin') : '';
    if (!pin) return alert('Session expired. Please log in again.');

    setIsAiConfigSaving(true);
    try {
      const res = await fetch('/api/admin/ai-config', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-pin': pin
        },
        body: JSON.stringify({ aiAutoSettle: updatedSettle, aiSettleDelayMs: updatedDelay })
      });
      const data = await res.json();
      if (res.ok) {
        setAiAutoSettle(data.config.aiAutoSettle);
        setAiSettleDelayMs(data.config.aiSettleDelayMs);
      } else {
        alert(`Failed to save AI config: ${data.error || 'Server error'}`);
      }
    } catch {
      alert('Network error while saving AI configurations.');
    } finally {
      setIsAiConfigSaving(false);
    }
  };

  const fetchLogs = () => {
    const pin = typeof window !== 'undefined' ? sessionStorage.getItem('blastpay_admin_pin') : '';
    if (!pin) return;

    fetch('/api/admin/logs', {
      headers: { 'x-admin-pin': pin },
      cache: 'no-store'
    })
      .then(res => {
        if (res.status === 401) {
          setIsPasscodeVerified(false);
          sessionStorage.removeItem('blastpay_admin_pin');
          throw new Error('Unauthorized');
        }
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data)) {
          setLogs(data);
        }
      })
      .catch(() => {});
  };

  const handleVerifyTransfer = async (transactionId: string, action: 'approve' | 'reject', type: 'deposit' | 'withdrawal' = 'deposit') => {
    const pin = typeof window !== 'undefined' ? sessionStorage.getItem('blastpay_admin_pin') : '';
    if (!pin) return alert('Session expired. Please log in again.');

    const confirmed = window.confirm(`Are you sure you want to ${action} this pending ${type}?`);
    if (!confirmed) return;

    try {
      const res = await fetch('/api/admin/verify-transfer', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-pin': pin
        },
        body: JSON.stringify({ transactionId, action })
      });
      const data = await res.json();
      if (res.ok) {
        if (type === 'deposit') {
          alert(`Deposit successfully ${action === 'approve' ? 'approved & player credited!' : 'rejected'}`);
        } else {
          alert(`Withdrawal successfully ${action === 'approve' ? 'marked as paid!' : 'rejected & refunded to player!'}`);
        }
        fetchConfigs();
      } else {
        alert(`Action Failed: ${data.error || 'Server error'}`);
      }
    } catch {
      alert('Network error. Transfer resolution failed.');
    }
  };

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const pin = sessionStorage.getItem('blastpay_admin_pin');
      if (pin) {
        setIsPasscodeVerified(true);
      } else {
        router.replace('/admin/login');
      }
    }

    fetchConfigs();
    fetchLogs();
    fetchAiConfig();
    
    // Poll configs, telemetry logs, and AI status every 2 seconds to keep dashboard fully live-syncing!
    const interval = setInterval(() => {
      fetchConfigs();
      fetchLogs();
      fetchAiConfig();
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  // Sync available profit amount in modal
  useEffect(() => {
    if (showWithdrawProfitModal) {
      setWithdrawAmount(Math.max(0, houseProfitDeficit).toFixed(2));
      setWithdrawError('');
      setWithdrawSuccess('');
      setWithdrawPin('');
    }
  }, [showWithdrawProfitModal, houseProfitDeficit]);

  // Auth Guard
  useEffect(() => {
    if (!isLoading && !isPasscodeVerified) {
      router.replace('/admin/login');
    }
  }, [isLoading, isPasscodeVerified, router]);

  const handleWithdrawProfit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!withdrawAmount || !withdrawAccountNumber || !withdrawPin) {
      return setWithdrawError('Please fill in all withdrawal fields.');
    }

    setWithdrawError('');
    setWithdrawSuccess('');
    setIsWithdrawing(true);

    try {
      const res = await fetch('/api/admin/withdraw-profit', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-pin': withdrawPin
        },
        body: JSON.stringify({
          amount: parseFloat(withdrawAmount),
          bankCode: withdrawBankCode,
          accountNumber: withdrawAccountNumber,
          adminUserId: user?.id
        })
      });

      const result = await res.json();
      if (res.ok && result.status === 'success') {
        setWithdrawSuccess('Platform profit payout dispatched successfully!');
        fetchConfigs(); // reload stats dynamically
        setTimeout(() => {
          setShowWithdrawProfitModal(false);
        }, 2000);
      } else {
        setWithdrawError(result.error || 'Failed to dispatch platform profit');
      }
    } catch (err) {
      setWithdrawError('Payout gateway connection error');
    } finally {
      setIsWithdrawing(false);
    }
  };

  const handleVerifyPasscode = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    
    setIsLoading(true);
    setPasscodeError('');

    try {
      const res = await fetch('/api/admin/config', {
        headers: { 'x-admin-pin': passcodeInput },
        cache: 'no-store'
      });

      if (res.ok) {
        sessionStorage.setItem('blastpay_admin_pin', passcodeInput);
        setIsPasscodeVerified(true);
        setPasscodeError('');
        
        // Load configurations
        const data = await res.json();
        setCrashHouseEdge(typeof data.crashHouseEdge === 'number' ? data.crashHouseEdge : 5);
        setCrashMaxMultiplier(typeof data.crashMaxMultiplier === 'number' ? data.crashMaxMultiplier : 100);
        setMinesHouseEdge(typeof data.minesHouseEdge === 'number' ? data.minesHouseEdge : 5);
        setPlinkoHouseEdge(typeof data.plinkoHouseEdge === 'number' ? data.plinkoHouseEdge : 5);
        setIsRigged(!!data.isRigged);
        setPlinkoRiggedBucket(data.plinkoRiggedBucket || '');
        setActiveNextCrash(data.nextCrashMultiplier !== undefined ? data.nextCrashMultiplier : null);
        setIsMinesRiggedNextClick(data.isMinesRiggedNextClick || 'normal');
        setSandboxPaymentMode(typeof data.sandboxPaymentMode === 'boolean' ? data.sandboxPaymentMode : true);
        setBannedUsers(data.bannedUsers || []);
        setFrozenUsers(data.frozenUsers || []);
        setTotalDeposits(data.totalDeposits || 0);
        setTotalWithdrawals(data.totalWithdrawals || 0);
        setActiveUsers(data.activeUsersCount || 0);
        setGrowthPercent(data.simulatedGrowth || 0);
        setAllPlatformUsers(data.usersList || []);
        setGlobalRigOutcome(data.globalRigOutcome || null);
        setTotalPlayerBalances(data.totalPlayerBalances || 0);
        setNetCashFloat(data.netCashFloat || 0);
        setHouseProfitDeficit(data.houseProfitDeficit !== undefined ? data.houseProfitDeficit : 0);
        setCoverageRatio(data.coverageRatio !== undefined ? data.coverageRatio : 100);

        // Fetch logs
        const logsRes = await fetch('/api/admin/logs', {
          headers: { 'x-admin-pin': passcodeInput },
          cache: 'no-store'
        });
        if (logsRes.ok) {
          const logsData = await logsRes.json();
          if (Array.isArray(logsData)) {
            setLogs(logsData);
          }
        }

        // Log connection
        await fetch('/api/admin/logs', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-admin-pin': passcodeInput
          },
          body: JSON.stringify({
            tag: 'SECURITY',
            message: `🔐 Operator session authorized via secure passcode entry.`
          })
        }).catch(() => {});

      } else {
        setPasscodeError('AUTHENTICATION FAILED: INVALID ACCESS KEY');
      }
    } catch (err) {
      setPasscodeError('CONNECTION ERROR: COULD NOT CONNECT TO SECURITY GATE');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDisconnect = () => {
    sessionStorage.removeItem('blastpay_admin_pin');
    setIsPasscodeVerified(false);
    setPasscodeInput('');
    router.push('/virtuals'); // redirect to games lobby
  };

  const handleSaveConfigs = async (overrideParams?: any) => {
    setIsSaving(true);
    setSaveSuccess(false);

    const payload = {
      crashHouseEdge,
      crashMaxMultiplier,
      minesHouseEdge,
      plinkoHouseEdge,
      isRigged,
      plinkoRiggedBucket: plinkoRiggedBucket || null,
      nextCrashMultiplier: nextCrashMultiplier ? parseFloat(nextCrashMultiplier) : activeNextCrash,
      isMinesRiggedNextClick: isMinesRiggedNextClick === 'normal' ? null : isMinesRiggedNextClick,
      sandboxPaymentMode,
      bannedUsers,
      frozenUsers,
      totalDeposits,
      totalWithdrawals,
      activeUsersCount: activeUsers,
      simulatedGrowth: growthPercent,
      globalRigOutcome,
      ...overrideParams
    };

    const pin = typeof window !== 'undefined' ? sessionStorage.getItem('blastpay_admin_pin') : '';

    try {
      const res = await fetch('/api/admin/config', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-pin': pin || ''
        },
        body: JSON.stringify(payload)
      });

      const result = await res.json();
      if (res.ok && result.config) {
        setSaveSuccess(true);
        setActiveNextCrash(result.config.nextCrashMultiplier);
        setIsMinesRiggedNextClick(result.config.isMinesRiggedNextClick || 'normal');
        setPlinkoRiggedBucket(result.config.plinkoRiggedBucket || '');
        setBannedUsers(result.config.bannedUsers || []);
        setFrozenUsers(result.config.frozenUsers || []);
        setGlobalRigOutcome(result.config.globalRigOutcome || null);
        if (overrideParams && overrideParams.nextCrashMultiplier === null) {
          setNextCrashMultiplier('');
        }
        
        // Log configuration update to telemetry engine!
        let rigStr = result.config.globalRigOutcome ? `GLOBAL RIGGING: [${result.config.globalRigOutcome.toUpperCase()}]` : 'Standard Fair Odds';
        fetch('/api/admin/logs', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-admin-pin': pin || ''
          },
          body: JSON.stringify({
            tag: 'SECURITY',
            message: `⚙️ Platform override configurations updated manually. Settings [${rigStr}]`
          })
        }).catch(() => {});

        setTimeout(() => setSaveSuccess(false), 2000);
      }
    } catch (err) {
      console.error('Failed to update admin configs');
    } finally {
      setIsSaving(false);
    }
  };

  const handleOpenCreditModal = (targetUser: any) => {
    setSelectedUser({
      username: targetUser.username,
      balance: targetUser.balance || 0,
      isGuest: targetUser.isGuest || targetUser.is_guest || false
    });
    setCreditAmount('0.00');
    setShowCreditModal(true);
  };

  const handleAdjustBalance = async (action: 'credit' | 'drain') => {
    if (!selectedUser) return;
    const amt = parseFloat(creditAmount);
    if (isNaN(amt) || amt <= 0) return alert('Please enter a valid NGN amount.');

    if (frozenUsers.includes(selectedUser.username)) {
      return alert('This account wallet is locked/frozen! Clear the freeze from the ledger first.');
    }

    if (action === 'drain' && amt > selectedUser.balance) {
      return alert('Deduction exceeds player available balance!');
    }

    try {
      const pin = typeof window !== 'undefined' ? sessionStorage.getItem('blastpay_admin_pin') : '';
      const res = await fetch('/api/admin/adjust', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-admin-pin': pin || ''
        },
        body: JSON.stringify({
          username: selectedUser.username,
          amount: amt,
          action
        })
      });

      if (res.ok) {
        alert(`Successfully ${action === 'credit' ? 'credited' : 'deducted'} ₦${amt.toFixed(2)} NGN.`);
        fetchConfigs();
      } else {
        const errData = await res.json();
        alert(`Failed to adjust balance: ${errData.error || 'Server error'}`);
      }
    } catch {
      alert('Failed to execute balance adjustment due to a network error.');
    }

    setShowCreditModal(false);
  };

  const handleBanUser = (username: string) => {
    let updatedBans = [...bannedUsers];
    if (updatedBans.includes(username)) {
      updatedBans = updatedBans.filter(u => u !== username);
    } else {
      updatedBans.push(username);
      if (user && user.username === username) {
        alert('You have banned your own operator profile! Terminating active session...');
        logout();
      }
    }
    setBannedUsers(updatedBans);
    handleSaveConfigs({ bannedUsers: updatedBans });
  };

  const handleFreezeUser = (username: string) => {
    let updatedFrozen = [...frozenUsers];
    if (updatedFrozen.includes(username)) {
      updatedFrozen = updatedFrozen.filter(u => u !== username);
    } else {
      updatedFrozen.push(username);
    }
    setFrozenUsers(updatedFrozen);
    handleSaveConfigs({ frozenUsers: updatedFrozen });
  };

  const triggerRigNextCrash = (multiplier: number) => {
    setNextCrashMultiplier(multiplier.toString());
    handleSaveConfigs({ nextCrashMultiplier: multiplier });
  };

  const triggerRigMinesClick = (rigType: 'bomb' | 'gem' | 'normal') => {
    setIsMinesRiggedNextClick(rigType);
    handleSaveConfigs({ isMinesRiggedNextClick: rigType === 'normal' ? null : rigType });
  };

  if (isLoading || !isPasscodeVerified) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'radial-gradient(circle at top, #18092b 0%, #08030e 100%)',
        color: '#ffffff',
        fontFamily: "'Outfit', sans-serif"
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
          <Loader2 size={40} className="animate-spin" style={{ color: '#a367ff' }} />
          <p style={{ color: '#8c829d', fontSize: '0.9rem', fontWeight: 600 }}>Securing Connection Gateway...</p>
        </div>
      </div>
    );
  }

  const houseProfit = totalDeposits - totalWithdrawals;

  return (
    <div className={styles.page} style={{ padding: 0 }}>
      {/* Standard Administrative Navbar */}
      <nav className={styles.navbar}>
        <div className={styles.brandGroup}>
          <Shield size={20} color="#00e676" />
          <span className={styles.brandTitle}>BLASTPAY OPERATOR GATE</span>
        </div>

        <div className={styles.navLinks}>
          <a href="#dashboard" className={styles.navLink}>
            📊 Dashboard
          </a>
          <a href="#overrides" className={styles.navLink}>
            ⚙️ Odds Rigging
          </a>
          <a href="#ledger" className={styles.navLink}>
            👥 Player Ledger
          </a>
          <a href="#telemetry" className={styles.navLink}>
            📡 Live Telemetry
          </a>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
          <div className={styles.navStatusBadge}>
            <span style={{ display: 'inline-block', width: '8px', height: '8px', borderRadius: '50%', background: '#00e676', boxShadow: '0 0 10px #00e676' }} className="animate-pulse" />
            SECURED GATE ACTIVE
          </div>
          
          <button onClick={handleDisconnect} className={styles.btnDisconnect}>
            Disconnect Operator
          </button>
        </div>
      </nav>

      <div className={styles.dashboardContainer} style={{ padding: '2rem' }}>

        {/* Modal: Direct Balance Credit & Drain */}
        {showCreditModal && selectedUser && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent}>
              <div className={styles.modalHeader}>Manage Account Wallet</div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', marginBottom: '1.5rem' }}>
                Adjusting balance for active user: <strong>{selectedUser.username}</strong>
              </p>

              <div className={styles.modalBody}>
                <div className="form-group">
                  <label>Adjustment Amount (₦ NGN)</label>
                  <input 
                    type="number" 
                    className={styles.numberInput} 
                    value={creditAmount} 
                    onChange={e => setCreditAmount(e.target.value)} 
                    placeholder="5000.00"
                  />
                </div>

                <div className={styles.btnActionsGroup}>
                  <button 
                    type="button" 
                    className={styles.btnModalDeposit} 
                    onClick={() => handleAdjustBalance('credit')}
                  >
                    Add NGN (Credit)
                  </button>
                  <button 
                    type="button" 
                    className={styles.btnModalWithdraw} 
                    onClick={() => handleAdjustBalance('drain')}
                  >
                    Deduct NGN (Drain)
                  </button>
                </div>

                <button 
                  type="button" 
                  className={styles.btnModalCancel} 
                  onClick={() => setShowCreditModal(false)}
                >
                  Cancel Adjustment
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Modal: Withdraw Platform Profit */}
        {showWithdrawProfitModal && (
          <div className={styles.modalOverlay}>
            <div className={styles.modalContent} style={{ maxWidth: '480px' }}>
              <div className={styles.modalHeader} style={{ color: '#00e676', borderBottom: '1px solid rgba(0, 230, 118, 0.2)' }}>
                💰 Withdraw Net Platform Yield
              </div>
              <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', textAlign: 'center', margin: '1rem 0' }}>
                Dispatch platform house margins to an external operator clearing account.
              </p>

              {withdrawSuccess && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'rgba(0, 230, 118, 0.1)', color: '#00e676', border: '1px solid rgba(0, 230, 118, 0.2)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '1rem', fontWeight: 600 }}>
                  <CheckCircle2 size={16} /> {withdrawSuccess}
                </div>
              )}

              {withdrawError && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', backgroundColor: 'rgba(255, 68, 68, 0.1)', color: '#ff4444', border: '1px solid rgba(255, 68, 68, 0.2)', padding: '0.75rem', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '1rem', fontWeight: 600 }}>
                  <AlertCircle size={16} /> {withdrawError}
                </div>
              )}

              <form onSubmit={handleWithdrawProfit} className="auth-form" style={{ width: '100%' }}>
                <div className="form-group">
                  <label style={{ color: '#b0a8be', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Select Clearing Bank</label>
                  <select 
                    value={withdrawBankCode}
                    onChange={e => setWithdrawBankCode(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.8rem',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid rgba(163, 103, 255, 0.2)',
                      borderRadius: '8px',
                      color: '#fff',
                      outline: 'none',
                      fontSize: '0.9rem'
                    }}
                  >
                    <option value="044" style={{ background: '#0d0614' }}>Access Bank</option>
                    <option value="058" style={{ background: '#0d0614' }}>GTBank</option>
                    <option value="011" style={{ background: '#0d0614' }}>First Bank</option>
                    <option value="033" style={{ background: '#0d0614' }}>UBA</option>
                    <option value="057" style={{ background: '#0d0614' }}>Zenith Bank</option>
                    <option value="999992" style={{ background: '#0d0614' }}>OPay / Paycom</option>
                    <option value="999991" style={{ background: '#0d0614' }}>Palmpay</option>
                    <option value="035" style={{ background: '#0d0614' }}>Wema Bank</option>
                  </select>
                </div>

                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label style={{ color: '#b0a8be', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Recipient Account Number</label>
                  <input 
                    type="text" 
                    maxLength={10}
                    placeholder="e.g. 0123456789"
                    value={withdrawAccountNumber}
                    onChange={e => setWithdrawAccountNumber(e.target.value.replace(/\D/g, ''))}
                    required
                    style={{
                      width: '100%',
                      padding: '0.8rem',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid rgba(163, 103, 255, 0.2)',
                      borderRadius: '8px',
                      color: '#fff',
                      outline: 'none',
                      fontSize: '0.9rem'
                    }}
                  />
                </div>

                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label style={{ color: '#b0a8be', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Payout Amount (₦ NGN)</label>
                  <input 
                    type="number"
                    step="0.01" 
                    placeholder="0.00"
                    value={withdrawAmount}
                    onChange={e => setWithdrawAmount(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '0.8rem',
                      background: 'rgba(0,0,0,0.4)',
                      border: '1px solid rgba(163, 103, 255, 0.2)',
                      borderRadius: '8px',
                      color: '#fff',
                      outline: 'none',
                      fontSize: '0.9rem'
                    }}
                  />
                  <div style={{ fontSize: '0.7rem', color: '#8c829d', marginTop: '0.25rem', textAlign: 'right' }}>
                    Available Profits (True Surplus): ₦{Math.max(0, houseProfitDeficit).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                  </div>
                </div>

                <div className="form-group" style={{ marginTop: '1rem' }}>
                  <label style={{ color: '#b0a8be', fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase' }}>Operator Access Passcode (PIN)</label>
                  <input 
                    type="password"
                    placeholder="••••"
                    value={withdrawPin}
                    onChange={e => setWithdrawPin(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '0.8rem',
                      background: 'rgba(255, 68, 68, 0.2)',
                      border: '1px solid rgba(255, 68, 68, 0.2)',
                      borderRadius: '8px',
                      color: '#fff',
                      outline: 'none',
                      fontSize: '0.9rem',
                      letterSpacing: '0.1em'
                    }}
                  />
                </div>

                <div className={styles.btnActionsGroup} style={{ marginTop: '1.5rem' }}>
                  <button 
                    type="submit" 
                    className={styles.btnModalDeposit} 
                    disabled={isWithdrawing}
                    style={{ backgroundColor: '#00e676', color: '#08030e', flex: 1 }}
                  >
                    {isWithdrawing ? (
                      <span style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', justifyContent: 'center' }}>
                        <Loader2 size={16} className="animate-spin" /> Discharging Payout...
                      </span>
                    ) : 'Confirm Profit Payout'}
                  </button>
                  <button 
                    type="button" 
                    className={styles.btnModalCancel}
                    onClick={() => setShowWithdrawProfitModal(false)}
                    disabled={isWithdrawing}
                    style={{ flex: 1 }}
                  >
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Top Header Section */}
        <div id="dashboard" className={styles.headerSection}>
          <div className={styles.titleGroup}>
            <h1>BlastPay Advanced Terminal</h1>
            <p>Hidden Backdoor Operators Panel & Game Manipulation Center</p>
          </div>
          <div className={styles.liveBadge} style={{ background: 'rgba(255, 68, 68, 0.1)', color: '#ff4444', border: '1px solid rgba(255, 68, 68, 0.3)' }}>
            <Activity className="animate-pulse" size={14} /> Backdoor Active
          </div>
        </div>

        {/* System Liquidity & Float Engine Section */}
        <div className={styles.liquiditySection}>
          <div className={styles.panelTitle} style={{ borderBottom: '1px solid rgba(163, 103, 255, 0.15)', color: '#a367ff', margin: 0, paddingBottom: '0.75rem' }}>
            <Shield size={20} color="#a367ff" /> 🏦 SYSTEM LIQUIDITY & FLOAT ENGINE
          </div>

          <div className={styles.liquidityGrid}>
            <div className={styles.liquidityCardsGrid}>
              
              {/* Cash Float Card */}
              <div className={styles.liquidityCard}>
                <div className={styles.liquidityCardHeader}>
                  <span className={styles.liquidityCardTitle}>Net Cash Float (Vault)</span>
                  <DollarSign size={18} style={{ color: '#00e676', opacity: 0.7 }} />
                </div>
                <div>
                  <div className={styles.liquidityCardValue}>
                    {netCashFloat.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    <span className={styles.currency}>NGN</span>
                  </div>
                  <div className={styles.liquidityCardTrend} style={{ color: '#00e676' }}>
                    <Activity size={12} /> Live platform cash bankroll
                  </div>
                </div>
              </div>

              {/* Player Liabilities Card */}
              <div className={styles.liquidityCard}>
                <div className={styles.liquidityCardHeader}>
                  <span className={styles.liquidityCardTitle}>Total Player Liabilities</span>
                  <Users size={18} style={{ color: '#a367ff', opacity: 0.7 }} />
                </div>
                <div>
                  <div className={styles.liquidityCardValue} style={{ color: 'rgba(255,255,255,0.9)' }}>
                    {totalPlayerBalances.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    <span className={styles.currency}>NGN</span>
                  </div>
                  <div className={styles.liquidityCardTrend} style={{ color: 'rgba(255,255,255,0.45)' }}>
                    <TrendingUp size={12} /> Active player wallet debt
                  </div>
                </div>
              </div>

              {/* True Operating Surplus Card */}
              <div className={styles.liquidityCard}>
                <div className={styles.liquidityCardHeader}>
                  <span className={styles.liquidityCardTitle}>True Operating Surplus</span>
                  <TrendingUp size={18} style={{ color: houseProfitDeficit >= 0 ? '#00e676' : '#ff4444', opacity: 0.7 }} />
                </div>
                <div>
                  <div className={styles.liquidityCardValue} style={{ color: houseProfitDeficit >= 0 ? '#00e676' : '#ff4444' }}>
                    {houseProfitDeficit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    <span className={styles.currency}>NGN</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <span className={styles.liquidityCardTrend} style={{ color: 'rgba(255,255,255,0.45)' }}>
                      Unclaimed game margin
                    </span>
                    {houseProfitDeficit > 0 && (
                      <button 
                        onClick={() => setShowWithdrawProfitModal(true)}
                        className={styles.quickActionBtn}
                      >
                        <CreditCard size={11} /> Payout Profit
                      </button>
                    )}
                  </div>
                </div>
              </div>

            </div>

            {/* Solvency Health visualization */}
            <div className={styles.liquidityVisualPanel}>
              <div className={styles.coverageGaugeContainer}>
                <svg width="140" height="140" viewBox="0 0 140 140">
                  <circle 
                    className={styles.gaugeBackground} 
                    cx="70" 
                    cy="70" 
                    r="55" 
                  />
                  <circle 
                    className={styles.gaugeFill} 
                    cx="70" 
                    cy="70" 
                    r="55" 
                    stroke={
                      coverageRatio >= 100 
                        ? '#00e676' 
                        : coverageRatio >= 80 
                          ? '#ffb300' 
                          : '#ff4444'
                    }
                    strokeDasharray={`${2 * Math.PI * 55}`}
                    strokeDashoffset={`${2 * Math.PI * 55 * (1 - Math.min(100, Math.max(0, coverageRatio)) / 100)}`}
                  />
                </svg>
                <div className={styles.gaugeText}>
                  <span className={styles.gaugePercent}>
                    {coverageRatio.toFixed(1)}%
                  </span>
                  <span className={styles.gaugeLabel}>Coverage</span>
                </div>
              </div>

              {/* Health state badges */}
              {coverageRatio >= 100 ? (
                <div className={`${styles.healthStatusBadge} ${styles.healthHealthy}`}>
                  <CheckCircle2 size={12} /> Reserves Secured
                </div>
              ) : coverageRatio >= 80 ? (
                <div className={`${styles.healthStatusBadge} ${styles.healthWarning}`}>
                  <AlertTriangle size={12} /> Capital Tension
                </div>
              ) : (
                <div className={`${styles.healthStatusBadge} ${styles.healthCritical}`}>
                  <ShieldAlert size={12} className="animate-bounce" /> Reserves Deficit
                </div>
              )}

              <div className={styles.liquidityVisualTitle}>
                {coverageRatio >= 100 
                  ? 'System Solvency Fully Funded' 
                  : coverageRatio >= 80 
                    ? 'Tight Payout Cash Reserves' 
                    : 'System Reserves Vulnerable'}
              </div>
              <div className={styles.liquidityVisualDesc}>
                {coverageRatio >= 100 
                  ? 'Cash in vault completely covers active player balances with dynamic surplus margins.' 
                  : coverageRatio >= 80 
                    ? 'System is stable, but capital reserves are tight. Ensure operator withdrawals are suspended.' 
                    : 'Solvency ratio is critically low! Cash in vault is insufficient to fulfill total player liabilities.'}
              </div>
            </div>
          </div>
        </div>

        {/* Growth Stats counters */}
        <div className={styles.statsGrid}>
          
          <div className={styles.statCard}>
            <DollarSign className={styles.statIcon} size={48} />
            <div className={styles.statLabel}>Total Platform Deposits</div>
            <div className={styles.statValue}>
              {totalDeposits.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className={styles.currency}>NGN</span>
            </div>
            <div className={`${styles.statTrend} ${styles.trendUp}`}>
              <TrendingUp size={14} /> +{growthPercent}% Growth
            </div>
          </div>

          <div className={styles.statCard}>
            <DollarSign className={styles.statIcon} size={48} />
            <div className={styles.statLabel}>Total Platform Payouts</div>
            <div className={styles.statValue}>
              {totalWithdrawals.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className={styles.currency}>NGN</span>
            </div>
            <div className={styles.statTrend} style={{ color: 'rgba(255,255,255,0.4)' }}>
              Dispatched payout money
            </div>
          </div>

          <div className={styles.statCard}>
            <TrendingUp className={styles.statIcon} size={48} />
            <div className={styles.statLabel}>Net profit cut (House margin)</div>
            <div className={styles.statValue} style={{ color: '#00e676' }}>
              {houseProfit.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} <span className={styles.currency}>NGN</span>
            </div>
            <div className={`${styles.statTrend} ${styles.trendUp}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
              <span>Operator net yield</span>
              {houseProfit > 0 && (
                <button 
                  onClick={() => setShowWithdrawProfitModal(true)}
                  style={{
                    backgroundColor: '#00e676',
                    color: '#08030e',
                    border: 'none',
                    borderRadius: '4px',
                    padding: '0.25rem 0.5rem',
                    fontSize: '0.7rem',
                    fontWeight: 700,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    boxShadow: '0 0 10px rgba(0, 230, 118, 0.3)',
                    transition: 'all 0.2s'
                  }}
                >
                  <CreditCard size={12} /> Withdraw
                </button>
              )}
            </div>
          </div>

          <div className={styles.statCard}>
            <Users className={styles.statIcon} size={48} />
            <div className={styles.statLabel}>Active Gaming Profiles</div>
            <div className={styles.statValue}>
              {activeUsers} <span className={styles.currency}>Players</span>
            </div>
            <div className={`${styles.statTrend} ${styles.trendUp}`}>
              Active platform sessions
            </div>
          </div>

        </div>

        {/* Advanced Game Manipulation Section */}
        <div id="overrides" className={styles.glassPanel} style={{ border: '1px solid rgba(255, 68, 68, 0.25)', background: 'rgba(25, 10, 20, 0.65)' }}>
          <div className={styles.panelTitle} style={{ color: '#ff4444' }}>
            <ShieldAlert size={22} /> Advanced Real-Time Game Manipulation Override Engine
          </div>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', marginTop: '1rem' }}>
            
            {/* Rig next Aviator outcome */}
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.25rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--accent-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Flame size={16} /> Aviator Next Flight Multiplier Target
              </h3>

              {typeof activeNextCrash === 'number' ? (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'rgba(0, 230, 118, 0.1)', color: '#00e676', border: '1px solid rgba(0, 230, 118, 0.2)', padding: '0.6rem 0.85rem', borderRadius: '6px', fontSize: '0.8rem', marginBottom: '1rem', fontWeight: 700 }}>
                  <span>🎯 Active Trigger: Next flight crashes exactly at {activeNextCrash.toFixed(2)}x</span>
                  <button 
                    onClick={() => handleSaveConfigs({ nextCrashMultiplier: null })}
                    style={{ background: 'transparent', border: 'none', color: '#ff4444', fontWeight: 700, cursor: 'pointer' }}
                  >
                    Cancel
                  </button>
                </div>
              ) : (
                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1rem' }}>
                  No target active. Next round will crash dynamically on standard odds. Set one below:
                </p>
              )}

              <div className="form-group" style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="number" 
                  step="0.01" 
                  className={styles.numberInput} 
                  value={nextCrashMultiplier}
                  onChange={e => setNextCrashMultiplier(e.target.value)}
                  placeholder="e.g. 5.50"
                />
                <button 
                  type="button" 
                  className={styles.btnSave} 
                  onClick={() => handleSaveConfigs()}
                  style={{ marginTop: 0, padding: '0 1rem' }}
                >
                  Set
                </button>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.35rem', marginTop: '0.75rem' }}>
                <button type="button" onClick={() => triggerRigNextCrash(1.00)} style={{ padding: '0.4rem', fontSize: '0.75rem', background: '#ff4444', border: 'none', color: '#fff', borderRadius: '4px', cursor: 'pointer', fontWeight: 700 }}>1.00x 🛑</button>
                <button type="button" onClick={() => triggerRigNextCrash(2.50)} style={{ padding: '0.4rem', fontSize: '0.75rem', background: 'rgba(163,103,255,0.2)', border: '1px solid var(--accent-primary)', color: '#fff', borderRadius: '4px', cursor: 'pointer', fontWeight: 700 }}>2.50x</button>
                <button type="button" onClick={() => triggerRigNextCrash(5.00)} style={{ padding: '0.4rem', fontSize: '0.75rem', background: 'rgba(163,103,255,0.2)', border: '1px solid var(--accent-primary)', color: '#fff', borderRadius: '4px', cursor: 'pointer', fontWeight: 700 }}>5.00x</button>
                <button type="button" onClick={() => triggerRigNextCrash(10.00)} style={{ padding: '0.4rem', fontSize: '0.75rem', background: 'rgba(163,103,255,0.2)', border: '1px solid var(--accent-primary)', color: '#fff', borderRadius: '4px', cursor: 'pointer', fontWeight: 700 }}>10.0x 🔥</button>
              </div>
            </div>

            {/* Rig Mines click outcome */}
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.25rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--accent-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Bomb size={16} /> Mines Game Click Rigging
              </h3>

              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1rem' }}>
                Manipulate the result of the player's very next tile click. Safe or instant bust:
              </p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer' }}>
                  <input 
                    type="radio" 
                    name="minesRig" 
                    checked={isMinesRiggedNextClick === 'normal'}
                    onChange={() => triggerRigMinesClick('normal')}
                  />
                  <span>Standard Odds (Fair Outcome)</span>
                </label>
                
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer', color: '#ff4444', fontWeight: 700 }}>
                  <input 
                    type="radio" 
                    name="minesRig" 
                    checked={isMinesRiggedNextClick === 'bomb'}
                    onChange={() => triggerRigMinesClick('bomb')}
                  />
                  <span>Force Next Click to contain a Bomb 💥</span>
                </label>

                <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.8rem', cursor: 'pointer', color: '#00e676', fontWeight: 700 }}>
                  <input 
                    type="radio" 
                    name="minesRig" 
                    checked={isMinesRiggedNextClick === 'gem'}
                    onChange={() => triggerRigMinesClick('gem')}
                  />
                  <span>Force Next Click to contain a Gem 💎</span>
                </label>
              </div>
            </div>

            {/* Rig Plinko Drop outcome */}
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.25rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
              <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--accent-primary)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <span style={{color: '#ff0055'}}>🔴</span> Plinko Bucket Rigging
              </h3>

              <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1rem' }}>
                Force the next ball to land in a specific bucket index (0-12).
                0 and 12 are 100x. 6 is 0.2x.
              </p>

              <div className="form-group" style={{ display: 'flex', gap: '0.5rem' }}>
                <input 
                  type="number" 
                  min="0"
                  max="12"
                  className={styles.numberInput} 
                  value={plinkoRiggedBucket}
                  onChange={e => setPlinkoRiggedBucket(e.target.value)}
                  placeholder="Bucket 0-12"
                />
                <button 
                  type="button" 
                  className={styles.btnSave} 
                  onClick={() => handleSaveConfigs()}
                  style={{ marginTop: 0, padding: '0 1rem' }}
                >
                  Set
                </button>
                <button 
                  type="button" 
                  onClick={() => { setPlinkoRiggedBucket(''); handleSaveConfigs({ plinkoRiggedBucket: null }); }}
                  style={{ marginTop: 0, padding: '0 1rem', background: 'transparent', border: '1px solid #ff4444', color: '#ff4444', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Sandbox Payment Control */}
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.25rem', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: 'var(--accent-primary)', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CreditCard size={16} /> Banking Gateway Auditing
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>
                  Toggle transaction callbacks standard. Sandbox bypass avoids making requests to Flutterwave NUBAN resolving servers.
                </p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1rem', backgroundColor: 'rgba(255,255,255,0.02)', padding: '0.5rem', borderRadius: '6px', border: '1px solid rgba(255,255,255,0.05)' }}>
                <span style={{ fontSize: '0.8rem', fontWeight: 700, color: sandboxPaymentMode ? '#00e676' : 'var(--accent-primary)' }}>
                  {sandboxPaymentMode ? '🧪 MOCK/SANDBOX INTERFACE' : '💰 FLUTTERWAVE REAL GATEWAY'}
                </span>
                <label className={styles.toggleSwitch}>
                  <input 
                    type="checkbox" 
                    checked={sandboxPaymentMode}
                    onChange={e => {
                      setSandboxPaymentMode(e.target.checked);
                      handleSaveConfigs({ sandboxPaymentMode: e.target.checked });
                    }}
                  />
                  <span className={styles.toggleSlider} />
                </label>
              </div>
            </div>

            {/* Global Game Rigging Controller */}
            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '1.25rem', borderRadius: '8px', border: '1px solid rgba(255, 68, 68, 0.2)', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
              <div>
                <h3 style={{ fontSize: '0.95rem', fontWeight: 800, color: '#ff4444', marginBottom: '0.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <ShieldAlert size={16} /> Global Game Rigging Controller
                </h3>
                <p style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', marginBottom: '1rem' }}>
                  Force the next bet outcome in ALL games (Slots, Roulette, Blackjack, Wheel, Aviator, Plinko, Dice) to win or lose instantly.
                </p>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.6rem' }}>
                <button
                  type="button"
                  onClick={() => handleSaveConfigs({ globalRigOutcome: 'win' })}
                  style={{
                    width: '100%',
                    backgroundColor: globalRigOutcome === 'win' ? '#00e676' : 'rgba(0, 230, 118, 0.1)',
                    border: '1px solid #00e676',
                    color: globalRigOutcome === 'win' ? '#000' : '#00e676',
                    fontWeight: 700,
                    padding: '0.65rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    transition: 'all 0.2s ease',
                    boxShadow: globalRigOutcome === 'win' ? '0 0 15px rgba(0, 230, 118, 0.4)' : 'none'
                  }}
                >
                  🎯 FORCE NEXT ROUND WINS (All Games)
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveConfigs({ globalRigOutcome: 'lose' })}
                  style={{
                    width: '100%',
                    backgroundColor: globalRigOutcome === 'lose' ? '#ff4444' : 'rgba(255, 68, 68, 0.1)',
                    border: '1px solid #ff4444',
                    color: globalRigOutcome === 'lose' ? '#fff' : '#ff4444',
                    fontWeight: 700,
                    padding: '0.65rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.85rem',
                    transition: 'all 0.2s ease',
                    boxShadow: globalRigOutcome === 'lose' ? '0 0 15px rgba(255, 68, 68, 0.4)' : 'none'
                  }}
                >
                  🚫 FORCE NEXT ROUND LOSSES (All Games)
                </button>

                <button
                  type="button"
                  onClick={() => handleSaveConfigs({ globalRigOutcome: null })}
                  style={{
                    width: '100%',
                    backgroundColor: globalRigOutcome === null ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    color: '#fff',
                    fontWeight: 600,
                    padding: '0.5rem',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '0.8rem',
                    transition: 'all 0.2s ease'
                  }}
                >
                  Release Rigging Controls (Fair Odds)
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Sliders and Odds controls */}
        <div className={styles.controlGrid}>
          
          <div className={styles.glassPanel}>
            <div className={styles.panelTitle}>
              <Sliders size={20} color="var(--accent-primary)" /> Standard Mathematical Edge Configurations
            </div>

            {/* Aviator controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.25rem' }}>
                ✈️ Aviator Standard Margins
              </h3>

              <div className={styles.controlRow}>
                <div className={styles.controlLabelGroup}>
                  <span className={styles.controlLabel}>Standard House Edge Margin</span>
                  <span className={styles.controlValueBadge}>{crashHouseEdge}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="90" 
                  className={styles.rangeSlider} 
                  value={crashHouseEdge}
                  onChange={e => setCrashHouseEdge(parseInt(e.target.value))}
                />
              </div>

              <div className={styles.controlRow}>
                <div className={styles.controlLabelGroup}>
                  <span className={styles.controlLabel}>Max Allowed Multiplier Limit</span>
                  <span className={styles.controlValueBadge}>{crashMaxMultiplier}x</span>
                </div>
                <input 
                  type="number" 
                  className={styles.numberInput} 
                  value={crashMaxMultiplier}
                  onChange={e => setCrashMaxMultiplier(Math.max(1, parseInt(e.target.value) || 1))}
                />
              </div>

              {/* Rig Aviator Toggle */}
              <div className={styles.rigToggleRow}>
                <div className={styles.rigTitleGroup}>
                  <h4><ShieldAlert size={16} /> Force Continuous 1.00x Crashes</h4>
                  <p>When active, all rounds instantly crash at 1.00x takeoff.</p>
                </div>
                <label className={styles.toggleSwitch}>
                  <input 
                    type="checkbox" 
                    checked={isRigged}
                    onChange={e => setIsRigged(e.target.checked)}
                  />
                  <span className={styles.toggleSlider} />
                </label>
              </div>
            </div>

            {/* Mines controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.25rem' }}>
                💎 Mines Standard Margins
              </h3>

              <div className={styles.controlRow}>
                <div className={styles.controlLabelGroup}>
                  <span className={styles.controlLabel}>Standard House Edge Margin</span>
                  <span className={styles.controlValueBadge}>{minesHouseEdge}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="90" 
                  className={styles.rangeSlider} 
                  value={minesHouseEdge}
                  onChange={e => setMinesHouseEdge(parseInt(e.target.value))}
                />
              </div>
            </div>

            {/* Plinko controls */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1rem' }}>
              <h3 style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--accent-primary)', textTransform: 'uppercase', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '0.25rem' }}>
                🔴 Plinko Standard Margins
              </h3>

              <div className={styles.controlRow}>
                <div className={styles.controlLabelGroup}>
                  <span className={styles.controlLabel}>Standard House Edge Margin</span>
                  <span className={styles.controlValueBadge}>{plinkoHouseEdge}%</span>
                </div>
                <input 
                  type="range" 
                  min="0" 
                  max="90" 
                  className={styles.rangeSlider} 
                  value={plinkoHouseEdge}
                  onChange={e => setPlinkoHouseEdge(parseInt(e.target.value))}
                />
              </div>
            </div>

            {/* Save Button */}
            <button 
              type="button" 
              className={styles.btnSave} 
              onClick={() => handleSaveConfigs()}
              disabled={isSaving}
            >
              {isSaving ? (
                <Loader2 className="animate-spin" size={16} />
              ) : saveSuccess ? (
                <Check size={16} style={{ color: '#00e676' }} />
              ) : <Settings size={16} />}
              {isSaving ? 'Applying Configs...' : saveSuccess ? 'Configs Active!' : 'Apply System Odds'}
            </button>

          </div>

          {/* SVG Growth Chart Sidebar */}
          <div className={styles.glassPanel} style={{ justifyContent: 'space-between' }}>
            <div>
              <div className={styles.panelTitle}>
                <TrendingUp size={20} color="var(--accent-primary)" /> Platform Cumulative Growth Chart
              </div>
              <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.25rem' }}>
                Visual cash flow trends matching platform margin indices.
              </p>

              {/* Dynamic Bar Charts */}
              <div className={styles.chartContainer}>
                <div className={styles.chartBar} style={{ height: '30%' }} />
                <div className={styles.chartBar} style={{ height: '45%' }} />
                <div className={styles.chartBar} style={{ height: '35%' }} />
                <div className={styles.chartBar} style={{ height: '60%' }} />
                <div className={styles.chartBar} style={{ height: '55%' }} />
                <div className={styles.chartBar} style={{ height: '80%' }} />
                <div className={styles.chartBar} style={{ height: `${Math.min(100, Math.max(10, growthPercent * 5))}%` }} />
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1rem' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>
                <Info size={14} color="var(--accent-primary)" /> Audit sandbox logs in the Next.js server console terminal.
              </div>
            </div>
          </div>

        </div>

        {/* 🤖 AI Auto-Settlement Payment Agent Control Portal */}
        <div className={styles.ledgerSection} style={{ 
          marginBottom: '1.5rem', 
          border: '1px solid rgba(0, 230, 118, 0.35)', 
          background: 'linear-gradient(135deg, rgba(8, 24, 15, 0.6) 0%, rgba(3, 10, 5, 0.8) 100%)',
          boxShadow: '0 8px 32px rgba(0, 230, 118, 0.05)',
          position: 'relative',
          overflow: 'hidden'
        }}>
          {/* Neon Grid Watermark */}
          <div style={{
            position: 'absolute',
            top: '-50px',
            right: '-50px',
            width: '180px',
            height: '180px',
            background: 'radial-gradient(circle, rgba(0, 230, 118, 0.08) 0%, transparent 70%)',
            pointerEvents: 'none'
          }} />

          <div className={styles.panelTitle} style={{ color: '#00e676', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity size={20} className={aiAutoSettle ? 'animate-pulse' : ''} />
              <span>🤖 AI Automated Payment Settlement Agent</span>
            </div>
            
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', fontSize: '0.75rem', fontWeight: 800, background: aiAutoSettle ? 'rgba(0, 230, 118, 0.1)' : 'rgba(255, 68, 68, 0.1)', color: aiAutoSettle ? '#00e676' : '#ff4444', padding: '0.2rem 0.6rem', borderRadius: '20px', border: aiAutoSettle ? '1px solid rgba(0, 230, 118, 0.2)' : '1px solid rgba(255, 68, 68, 0.2)' }}>
              <span style={{ display: 'inline-block', width: '6px', height: '6px', borderRadius: '50%', background: aiAutoSettle ? '#00e676' : '#ff4444', boxShadow: aiAutoSettle ? '0 0 8px #00e676' : 'none' }} />
              {aiAutoSettle ? 'AGENT ACTIVE & MONITORING' : 'AGENT SUSPENDED'}
            </div>
          </div>

          <p style={{ fontSize: '0.825rem', color: 'rgba(255,255,255,0.7)', marginTop: '0.35rem', lineHeight: '1.4' }}>
            When active, the AI engine monitors manual bank transfer requests in the database. It simulates banking network handshake receipt audits, automatically resolves player settlements in real-time, credits player balances, and pushes verified logs to your telemetry console.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', marginTop: '1.25rem', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '1rem' }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', fontWeight: 700, letterSpacing: '0.05em' }}>
                AI Core Toggle Operations
              </label>
              <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.25rem' }}>
                <button
                  onClick={() => handleSaveAiConfig(true, aiSettleDelayMs)}
                  disabled={isAiConfigSaving}
                  style={{
                    flex: 1,
                    backgroundColor: aiAutoSettle ? '#00e676' : 'rgba(255,255,255,0.03)',
                    color: aiAutoSettle ? '#08030e' : 'rgba(255,255,255,0.5)',
                    border: aiAutoSettle ? 'none' : '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '6px',
                    padding: '0.6rem',
                    fontSize: '0.8rem',
                    fontWeight: 900,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: aiAutoSettle ? '0 4px 15px rgba(0, 230, 118, 0.25)' : 'none'
                  }}
                >
                  Activate AI Settler ✔
                </button>
                <button
                  onClick={() => handleSaveAiConfig(false, aiSettleDelayMs)}
                  disabled={isAiConfigSaving}
                  style={{
                    flex: 1,
                    backgroundColor: !aiAutoSettle ? '#ff4444' : 'rgba(255,255,255,0.03)',
                    color: !aiAutoSettle ? '#ffffff' : 'rgba(255,255,255,0.5)',
                    border: !aiAutoSettle ? 'none' : '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '6px',
                    padding: '0.6rem',
                    fontSize: '0.8rem',
                    fontWeight: 900,
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: !aiAutoSettle ? '0 4px 15px rgba(255, 68, 68, 0.25)' : 'none'
                  }}
                >
                  Suspend AI Settler ✖
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
              <label style={{ fontSize: '0.75rem', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)', fontWeight: 700, letterSpacing: '0.05em' }}>
                Bank Telemetry Handshake Latency
              </label>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginTop: '0.25rem' }}>
                <input
                  type="range"
                  min="2000"
                  max="30000"
                  step="1000"
                  value={aiSettleDelayMs}
                  disabled={isAiConfigSaving}
                  onChange={(e) => setAiSettleDelayMs(Number(e.target.value))}
                  onMouseUp={(e) => handleSaveAiConfig(aiAutoSettle, Number((e.target as HTMLInputElement).value))}
                  onTouchEnd={(e) => handleSaveAiConfig(aiAutoSettle, Number((e.target as HTMLInputElement).value))}
                  style={{ flex: 1, accentColor: '#00e676', cursor: 'pointer' }}
                />
                <span style={{ fontFamily: 'monospace', fontWeight: 900, fontSize: '0.9rem', color: '#00e676', minWidth: '4.5rem', textAlign: 'right' }}>
                  {(aiSettleDelayMs / 1000).toFixed(0)} Seconds
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Direct Bank Transfer Verification Ledger - DEPOSITS */}
        <div className={styles.ledgerSection} style={{ marginBottom: '2.5rem', border: '1px solid rgba(163, 103, 255, 0.25)', background: 'rgba(20, 9, 35, 0.4)' }}>
          <div className={styles.panelTitle} style={{ color: 'var(--accent-primary)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <CreditCard size={20} /> Pending Deposit Requests
            {pendingTransfers.filter(tx => tx.type === 'deposit').length > 0 && (
              <span style={{ fontSize: '0.75rem', background: '#ffb300', color: '#08030e', padding: '0.15rem 0.4rem', borderRadius: '10px', fontWeight: 800, marginLeft: '0.5rem' }}>
                {pendingTransfers.filter(tx => tx.type === 'deposit').length} PENDING
              </span>
            )}
          </div>
          
          <div className={styles.tableWrapper}>
            {pendingTransfers.filter(tx => tx.type === 'deposit').length > 0 ? (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Date / Time</th>
                    <th>Player Username</th>
                    <th>Reference Details (Sender Info)</th>
                    <th>Deposit Amount</th>
                    <th>Status</th>
                    <th>Verification Operations</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingTransfers.filter(tx => tx.type === 'deposit').map((tx) => {
                    const username = tx.profiles?.username || 'Unknown';
                    const refString = tx.reference || '';
                    return (
                      <tr key={tx.id}>
                        <td style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
                          {new Date(tx.created_at).toLocaleString()}
                        </td>
                        <td style={{ fontWeight: 'bold', color: 'var(--accent-primary)' }}>
                          {username}
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>
                          <span style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.5rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.08)' }}>
                            {refString}
                          </span>
                        </td>
                        <td style={{ fontWeight: '800', color: '#00e676', fontSize: '0.95rem' }}>
                          ₦{parseFloat(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td>
                          <span style={{ backgroundColor: 'rgba(255, 179, 0, 0.1)', color: '#ffb300', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, border: '1px solid rgba(255, 179, 0, 0.2)' }}>
                            PENDING
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              onClick={() => handleVerifyTransfer(tx.id, 'approve', 'deposit')}
                              style={{
                                backgroundColor: '#00e676',
                                color: '#08030e',
                                border: 'none',
                                borderRadius: '4px',
                                padding: '0.35rem 0.75rem',
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '0.25rem',
                                boxShadow: '0 0 10px rgba(0, 230, 118, 0.2)',
                                transition: 'all 0.2s'
                              }}
                            >
                              Approve ✔
                            </button>
                            <button
                              onClick={() => handleVerifyTransfer(tx.id, 'reject', 'deposit')}
                              style={{
                                backgroundColor: 'transparent',
                                border: '1px solid #ff4444',
                                color: '#ff4444',
                                borderRadius: '4px',
                                padding: '0.35rem 0.75rem',
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                            >
                              Reject ✖
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', fontWeight: 600 }}>
                ● No pending deposits to verify.
              </div>
            )}
          </div>
        </div>

        {/* Direct Bank Transfer Verification Ledger - WITHDRAWALS */}
        <div className={styles.ledgerSection} style={{ marginBottom: '2.5rem', border: '1px solid rgba(255, 68, 68, 0.25)', background: 'rgba(35, 9, 9, 0.4)' }}>
          <div className={styles.panelTitle} style={{ color: '#ff4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <DollarSign size={20} /> Pending Withdrawal Requests
            {pendingTransfers.filter(tx => tx.type === 'withdrawal').length > 0 && (
              <span style={{ fontSize: '0.75rem', background: '#ff4444', color: '#fff', padding: '0.15rem 0.4rem', borderRadius: '10px', fontWeight: 800, marginLeft: '0.5rem' }}>
                {pendingTransfers.filter(tx => tx.type === 'withdrawal').length} PENDING
              </span>
            )}
          </div>
          
          <div className={styles.tableWrapper}>
            {pendingTransfers.filter(tx => tx.type === 'withdrawal').length > 0 ? (
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>Date / Time</th>
                    <th>Player Username</th>
                    <th>Destination Bank Details</th>
                    <th>Payout Amount</th>
                    <th>Status</th>
                    <th>Operator Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingTransfers.filter(tx => tx.type === 'withdrawal').map((tx) => {
                    const username = tx.profiles?.username || 'Unknown';
                    const refString = tx.reference || '';
                    return (
                      <tr key={tx.id}>
                        <td style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)' }}>
                          {new Date(tx.created_at).toLocaleString()}
                        </td>
                        <td style={{ fontWeight: 'bold', color: '#ff4444' }}>
                          {username}
                        </td>
                        <td style={{ fontSize: '0.85rem' }}>
                          <span style={{ backgroundColor: 'rgba(255,255,255,0.05)', padding: '0.3rem 0.6rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.08)', fontWeight: 700, color: '#fff' }}>
                            {refString}
                          </span>
                        </td>
                        <td style={{ fontWeight: '900', color: '#ff4444', fontSize: '0.95rem' }}>
                          -₦{parseFloat(tx.amount).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                        </td>
                        <td>
                          <span style={{ backgroundColor: 'rgba(255, 179, 0, 0.1)', color: '#ffb300', padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.7rem', fontWeight: 700, border: '1px solid rgba(255, 179, 0, 0.2)' }}>
                            PENDING PAYOUT
                          </span>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.5rem' }}>
                            <button
                              onClick={() => handleVerifyTransfer(tx.id, 'approve', 'withdrawal')}
                              style={{
                                backgroundColor: 'transparent',
                                border: '1px solid #00e676',
                                color: '#00e676',
                                borderRadius: '4px',
                                padding: '0.35rem 0.75rem',
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                transition: 'all 0.2s'
                              }}
                            >
                              Mark as Paid ✔
                            </button>
                            <button
                              onClick={() => handleVerifyTransfer(tx.id, 'reject', 'withdrawal')}
                              style={{
                                backgroundColor: '#ff4444',
                                border: 'none',
                                color: '#fff',
                                borderRadius: '4px',
                                padding: '0.35rem 0.75rem',
                                fontSize: '0.75rem',
                                fontWeight: 800,
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                                boxShadow: '0 0 10px rgba(255, 68, 68, 0.2)'
                              }}
                            >
                              Reject & Refund ✖
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            ) : (
              <div style={{ padding: '2rem', textAlign: 'center', color: 'rgba(255,255,255,0.4)', fontSize: '0.85rem', fontWeight: 600 }}>
                ● No pending withdrawals.
              </div>
            )}
          </div>
        </div>

        {/* Player & Wallet control ledger */}
        <div id="ledger" className={styles.ledgerSection}>
          <div className={styles.panelTitle}>
            <Users size={20} color="var(--accent-primary)" /> Player Accounts Security & Balance Ledger
          </div>
          
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Player Username</th>
                  <th>Contact/Credentials</th>
                  <th>Wallet Balance</th>
                  <th>System Status</th>
                  <th>Ledger Operations</th>
                  <th>Security Override</th>
                </tr>
              </thead>
              <tbody>
                {allPlatformUsers.length > 0 ? (
                  allPlatformUsers.map((profile) => {
                    const isBanned = bannedUsers.includes(profile.username);
                    const isFrozen = frozenUsers.includes(profile.username);
                    const isOperator = user && user.username === profile.username;
                    
                    return (
                      <tr key={profile.id}>
                        <td>
                          <div className={styles.usernameCell}>
                            {profile.username}
                            {isOperator && <span className={styles.userBadge}>Active Operator</span>}
                            {profile.is_guest && <span className={styles.guestBadge}>Guest</span>}
                          </div>
                        </td>
                        <td>
                          <span className={styles.methodBadge}>
                            {profile.contact?.includes('@') ? <Mail size={12} /> : <Smartphone size={12} />}
                            {' '}
                            {profile.contact || 'No contact'}
                          </span>
                        </td>
                        <td>
                          <strong style={{ color: 'var(--accent-primary)' }}>{Number(profile.balance || 0).toFixed(2)} NGN</strong>
                        </td>
                        <td>
                          <span style={{ color: isBanned ? '#ff4444' : '#00e676', fontWeight: 600 }}>
                            {isBanned ? '🚫 BANNED' : 'Active Online'}
                          </span>
                        </td>
                        <td>
                          <button 
                            type="button" 
                            className={styles.btnEditBalance}
                            onClick={() => handleOpenCreditModal(profile)}
                          >
                            Adjust Wallet
                          </button>
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: '0.35rem' }}>
                            <button 
                              type="button" 
                              onClick={() => handleBanUser(profile.username)}
                              style={{
                                backgroundColor: isBanned ? '#00e676' : 'rgba(255, 68, 68, 0.1)',
                                border: `1px solid ${isBanned ? '#00e676' : '#ff4444'}`,
                                color: isBanned ? '#000' : '#ff4444',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                padding: '0.3rem 0.6rem',
                                borderRadius: '4px',
                                cursor: 'pointer'
                              }}
                            >
                              {isBanned ? 'Lift Ban' : 'Ban Account'}
                            </button>
                            <button 
                              type="button" 
                              onClick={() => handleFreezeUser(profile.username)}
                              style={{
                                backgroundColor: isFrozen ? '#a367ff' : 'rgba(255,255,255,0.05)',
                                border: `1px solid ${isFrozen ? '#a367ff' : 'rgba(255,255,255,0.1)'}`,
                                color: isFrozen ? '#fff' : 'rgba(255,255,255,0.6)',
                                fontSize: '0.7rem',
                                fontWeight: 700,
                                padding: '0.3rem 0.6rem',
                                borderRadius: '4px',
                                cursor: 'pointer'
                              }}
                            >
                              {isFrozen ? '❄️ Frozen' : 'Freeze'}
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={6} style={{ textAlign: 'center', padding: '2rem', color: 'rgba(255,255,255,0.3)' }}>
                      No player profiles found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Live System Activity Feed */}
        <div id="telemetry" className={styles.ledgerSection} style={{ background: 'rgba(5, 2, 10, 0.85)', border: '1px solid rgba(0, 230, 118, 0.2)', marginTop: '2.5rem' }}>
          <div className={styles.panelTitle} style={{ color: '#00e676', borderBottom: '1px solid rgba(0, 230, 118, 0.15)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Activity className="animate-pulse" size={20} color="#00e676" /> LIVE SYSTEM TELEMETRY AUDIT FEED
            </span>
            <span style={{ fontSize: '0.75rem', color: '#888', background: 'rgba(255,255,255,0.05)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>
              Real-Time Activity Logs (Last 100 Movements)
            </span>
          </div>

          <div style={{
            fontFamily: 'monospace',
            fontSize: '0.8rem',
            background: '#040106',
            border: '1px solid rgba(255,255,255,0.05)',
            borderRadius: '8px',
            padding: '1.25rem',
            marginTop: '1.5rem',
            maxHeight: '350px',
            overflowY: 'auto',
            display: 'flex',
            flexDirection: 'column',
            gap: '0.45rem',
            boxShadow: 'inset 0 4px 15px rgba(0,0,0,0.8)'
          }}>
            {logs.length === 0 ? (
              <div style={{ color: 'rgba(255,255,255,0.3)', textAlign: 'center', padding: '2rem' }}>
                📡 Standard handshake active. Awaiting fresh user interactions...
              </div>
            ) : (
              logs.map((log) => {
                let tagColor = '#fff';
                let tagBg = 'rgba(255,255,255,0.05)';
                if (log.tag === 'GAMEPLAY') {
                  tagColor = '#00e676';
                  tagBg = 'rgba(0, 230, 118, 0.1)';
                } else if (log.tag === 'WALLET') {
                  tagColor = '#fdd835';
                  tagBg = 'rgba(253, 216, 53, 0.1)';
                } else if (log.tag === 'SUPPORT') {
                  tagColor = '#00b0ff';
                  tagBg = 'rgba(0, 176, 255, 0.1)';
                } else if (log.tag === 'SYSTEM') {
                  tagColor = '#a367ff';
                  tagBg = 'rgba(163, 103, 255, 0.1)';
                } else if (log.tag === 'SECURITY') {
                  tagColor = '#ff4444';
                  tagBg = 'rgba(255, 68, 68, 0.1)';
                }

                return (
                  <div key={log.id} style={{ display: 'flex', gap: '0.75rem', borderBottom: '1px solid rgba(255,255,255,0.02)', paddingBottom: '0.35rem', alignItems: 'flex-start' }}>
                    <span style={{ color: 'rgba(255,255,255,0.35)', fontSize: '0.75rem', minWidth: '70px' }}>[{log.timestamp}]</span>
                    <span style={{
                      color: tagColor,
                      backgroundColor: tagBg,
                      border: `1px solid rgba(${tagColor === '#ff4444' ? '255,68,68' : tagColor === '#00e676' ? '0,230,118' : '255,255,255'}, 0.2)`,
                      fontSize: '0.65rem',
                      fontWeight: 900,
                      padding: '0.1rem 0.4rem',
                      borderRadius: '4px',
                      textTransform: 'uppercase',
                      minWidth: '75px',
                      textAlign: 'center'
                    }}>
                      {log.tag}
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.85)', wordBreak: 'break-all' }}>{log.message}</span>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
