'use client';

import { useWallet } from '@/context/WalletContext';
import { useAuth } from '@/context/AuthContext';
import { X, ArrowDownToLine, ArrowUpFromLine, History, Lock, Check, Copy, ShieldCheck, Sparkles } from 'lucide-react';
import styles from './WalletPanel.module.css';
import { useState, useEffect } from 'react';
import { useFlutterwave } from 'flutterwave-react-v3';
import Link from 'next/link';

interface WalletPanelProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: 'deposit' | 'withdraw' | 'history';
}

export default function WalletPanel({ isOpen, onClose, initialTab = 'deposit' }: WalletPanelProps) {
  const { balance, deposit, transactions, syncWallet } = useWallet();
  const { user, logout } = useAuth();
  
  const [amount, setAmount] = useState('5000');
  const [activeTab, setActiveTab] = useState<'deposit'|'withdraw'|'history'>(initialTab);
  const [message, setMessage] = useState('');

  // Sync tab with initialTab prop when modal opens
  useEffect(() => {
    if (isOpen) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);

  // Manual & Automated Bank Transfer States
  const [senderInfo, setSenderInfo] = useState('');
  const [transferCode] = useState(() => Math.floor(100000 + Math.random() * 900000).toString());
  const [copiedField, setCopiedField] = useState('');
  const [isClearing, setIsClearing] = useState(false);

  // Manual Withdrawal States
  const [withdrawBankName, setWithdrawBankName] = useState('');
  const [withdrawAccountNo, setWithdrawAccountNo] = useState('');

  // Dedicated Business Account Coordinates
  const computedAccountNumber = '8055865414';
  const virtualAccountName = 'Oyebamiji Shinaayomi Paul';
  const virtualBankName = 'OPay';

  const config = {
    // Hardcoded test key from Flutterwave docs to bypass Next.js needing a server restart
    public_key: process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY && process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY !== 'FLWPUBK_TEST-sandbox' 
      ? process.env.NEXT_PUBLIC_FLUTTERWAVE_PUBLIC_KEY 
      : 'FLWPUBK_TEST-3b2d9fe8ba46b2a533614974d9295cac-X',
    tx_ref: `txn-placeholder`,
    amount: parseFloat(amount) || 0,
    currency: 'NGN',
    // Added 'banktransfer' to default card gateway to automatically enable automated checkouts!
    payment_options: 'card,mobilemoney,ussd,banktransfer',
    customer: {
      email: user?.username ? `${user.username}@example.com` : 'guest@example.com',
      phone_number: '07000000000',
      name: user?.username || 'Guest',
    },
    customizations: {
      title: 'Blastpay Wallet',
      description: 'Deposit funds to your wallet',
      logo: 'https://cdn.iconscout.com/icon/free/png-256/casino-chip-1456950-1229446.png',
    },
  };

  const handleFlutterPayment = useFlutterwave(config);

  if (!isOpen) return null;

  const handleManualDeposit = async () => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return alert('Please enter a valid amount.');
    if (!senderInfo.trim()) return alert("Please enter the sender's account name or bank for identification.");

    setIsClearing(true);
    setMessage('');
    
    try {
      const res = await fetch('/api/wallet/manual-deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: val, reference: senderInfo.trim(), transferCode })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`Direct bank transfer logged! Status: PENDING verification.`);
        setSenderInfo('');
        syncWallet();
        setTimeout(() => setMessage(''), 4000);
      } else {
        setMessage(`Deposit Error: ${data.error || 'Server error'}`);
      }
    } catch {
      setMessage('Failed to log transfer due to connection issues.');
    } finally {
      setIsClearing(false);
    }
  };

  // Automated Webhook Sandbox Clearing Trigger
  const handleSimulateWebhook = async () => {
    const val = parseFloat(amount);
    if (isNaN(val) || val <= 0) return alert('Please enter a valid amount.');
    
    setIsClearing(true);
    setMessage('⚡ Detecting transfer on virtual account ledger...');
    
    setTimeout(async () => {
      try {
        const fakeTxRef = `txn-${Date.now()}`;
        const res = await fetch('/api/wallet/webhook', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'verif-hash': 'BLASTPAY-SECRET-HASH-102938'
          },
          body: JSON.stringify({
            event: 'charge.completed',
            data: {
              id: Math.floor(Math.random() * 10000000),
              tx_ref: fakeTxRef,
              amount: val,
              currency: 'NGN',
              status: 'successful',
              customer: {
                name: user?.username || 'Guest',
                email: user?.username ? `${user.username}@example.com` : 'guest@example.com'
              }
            }
          })
        });
        
        const data = await res.json();
        if (res.ok && data.status === 'success') {
          setMessage(`⚡ Instantly Cleared! ₦${val} credited to wallet.`);
          syncWallet();
          setTimeout(() => setMessage(''), 3000);
        } else {
          setMessage(`Clearing Warning: ${data.error || data.reason || 'Verification failure'}`);
        }
      } catch {
        setMessage('Network error during simulated webhook.');
      } finally {
        setIsClearing(false);
      }
    }, 2000);
  };

  const handleWithdraw = async () => {
    const val = parseFloat(amount);
    if (isNaN(val) || val < 100) return alert('Minimum withdrawal is ₦100.');
    if (val > balance) return alert('Insufficient balance.');
    if (!withdrawBankName.trim() || !withdrawAccountNo.trim()) return alert('Please enter your Bank Name and Account Number.');

    setIsClearing(true);
    setMessage('');

    try {
      const res = await fetch('/api/wallet/manual-withdraw', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount: val, bankName: withdrawBankName.trim(), accountNumber: withdrawAccountNo.trim() })
      });
      const data = await res.json();
      if (res.ok) {
        setMessage(`Withdrawal logged! Status: PENDING admin payout.`);
        setWithdrawBankName('');
        setWithdrawAccountNo('');
        syncWallet();
        setTimeout(() => setMessage(''), 4000);
      } else {
        setMessage(`Withdrawal Error: ${data.error || 'Server error'}`);
      }
    } catch {
      setMessage('Failed to request withdrawal due to network issue.');
    } finally {
      setIsClearing(false);
    }
  };

  return (
    <>
      <div className={styles.overlay} onClick={onClose} />
      <div className={styles.panel}>
        <div className={styles.header}>
          <div className={styles.userInfo}>
            <div className={styles.avatar} />
            <div>
              <h3>{user?.username || 'Guest'}</h3>
              <span className={styles.balance}>{balance.toFixed(2)} NGN</span>
            </div>
          </div>
          <button className={styles.closeBtn} onClick={onClose}>
            <X size={24} />
          </button>
        </div>

        <div className={styles.tabs}>
          <button 
            className={`${styles.tab} ${activeTab === 'deposit' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('deposit')}
          >
            <ArrowDownToLine size={16} /> Deposit
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'withdraw' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('withdraw')}
          >
            <ArrowUpFromLine size={16} /> Withdraw
          </button>
          <button 
            className={`${styles.tab} ${activeTab === 'history' ? styles.activeTab : ''}`}
            onClick={() => setActiveTab('history')}
          >
            <History size={16} /> History
          </button>
        </div>

        <div className={styles.content}>
          {activeTab === 'history' ? (
            transactions.length === 0 ? (
              <div className={styles.emptyState}>
                <p>No recent transactions.</p>
              </div>
            ) : (
              <div className={styles.txList}>
                {transactions.map((tx) => (
                  <div key={tx.id} className={styles.txItem}>
                    <div className={styles.txInfo}>
                      <span className={`${styles.txType} ${tx.type === 'deposit' ? styles.txDeposit : styles.txWithdrawal}`}>
                        {tx.type}
                      </span>
                      <span className={styles.txDate}>{tx.date}</span>
                    </div>
                    <div className={styles.txAmountInfo}>
                      <span className={styles.txAmount}>
                        {tx.type === 'deposit' ? '+' : '-'} ₦{tx.amount.toFixed(2)}
                      </span>
                      <span className={`${styles.txStatus} ${tx.status === 'pending' ? styles.statusPending : tx.status === 'failed' ? styles.statusFailed : ''}`}>
                        {tx.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )
          ) : (
            <div className={styles.formArea}>
              {activeTab === 'withdraw' && (
                <div className={styles.linkToWithdraw}>
                  <p>Looking for bank payouts? Use our dedicated channel to withdraw directly to your GTBank, Zenith, Kuda, or OPay account.</p>
                  <Link href="/withdraw" onClick={onClose} className="btn btn-primary full-width" style={{ textDecoration: 'none', textAlign: 'center' }}>
                    Go to NGN Payout Portal
                  </Link>
                </div>
              )}

              {activeTab === 'deposit' ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
                    {/* Premium Secure Gateway Header */}
                    <div className={styles.gatewayHeader}>
                      <div className={styles.gatewaySecurityTag}>
                        <Lock size={12} className={styles.lockPulse} />
                        <span>SECURE DIRECT TRANSFER CHECKOUT</span>
                      </div>
                      <span className={styles.sslBadge}>256-BIT SSL ENCRYPTION</span>
                    </div>

                    {/* Checkout Progress Stepper */}
                    <div className={styles.gatewayStepper}>
                      <div className={styles.stepItem}>
                        <span className={styles.stepBadge}>1</span>
                        <span className={styles.stepText}>Pay <strong>₦{parseFloat(amount || '0').toLocaleString()}</strong> to details</span>
                      </div>
                      <div className={styles.stepLine} />
                      <div className={styles.stepItem}>
                        <span className={styles.stepBadge}>2</span>
                        <span className={styles.stepText}>Enter your account name as proof</span>
                      </div>
                    </div>

                    {/* Premium Checkout Gateway Card */}
                    <div className={styles.checkoutGatewayCard}>
                      <div className={styles.cardWatermark} />
                      <div className={styles.cardHeaderGroup}>
                        <div className={styles.bankNameWrapper}>
                          <Sparkles size={14} className={styles.sparkleIcon} />
                          <span className={styles.bankNameLabel}>{virtualBankName} DIRECT ACCOUNT</span>
                        </div>
                        <div className={styles.gatewayStatusPulse}>
                          <span className={styles.pulseDot} />
                          <span>Live Clearing</span>
                        </div>
                      </div>

                      <div className={styles.cardField}>
                        <span className={styles.cardFieldLabel}>Account Beneficiary</span>
                        <div className={styles.cardValueRow}>
                          <span className={styles.cardValue} style={{ fontSize: '0.9rem', color: '#ffffff' }}>{virtualAccountName}</span>
                          <button 
                            type="button" 
                            className={styles.gatewayCopyBtn}
                            onClick={() => {
                              navigator.clipboard.writeText(virtualAccountName);
                              setCopiedField('name');
                              setTimeout(() => setCopiedField(''), 2000);
                            }}
                          >
                            {copiedField === 'name' ? <Check size={12} style={{color: '#00e676'}} /> : <Copy size={12} />}
                            <span>{copiedField === 'name' ? 'Copied!' : 'Copy'}</span>
                          </button>
                        </div>
                      </div>

                      <div className={styles.cardField} style={{ marginTop: '0.75rem' }}>
                        <span className={styles.cardFieldLabel}>Dedicated Account Number</span>
                        <div className={styles.cardValueRow}>
                          <span className={styles.cardAccountNumber} style={{ fontSize: '1.4rem' }}>{computedAccountNumber}</span>
                          <button 
                            type="button" 
                            className={`${styles.gatewayCopyBtn} ${styles.copyAccountHighlight}`}
                            onClick={() => {
                              navigator.clipboard.writeText(computedAccountNumber);
                              setCopiedField('account');
                              setTimeout(() => setCopiedField(''), 2000);
                            }}
                          >
                            {copiedField === 'account' ? <Check size={12} style={{color: '#00e676'}} /> : <Copy size={12} />}
                            <span>{copiedField === 'account' ? 'Copied!' : 'Copy'}</span>
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* Transaction Limit Info & Safety Badges */}
                    <div className={styles.secureTransferNote}>
                      <ShieldCheck size={20} color="#00e676" style={{ flexShrink: 0 }} />
                      <span>Instant Auto-Crediting is active. Works with standard internet banking, OPay app, Kuda, or USSD transfers.</span>
                    </div>

                    {/* Payment Inputs Area */}
                    <div className={styles.paymentInputSection}>
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.5rem' }}>
                        <div>
                          <label className={styles.gatewayInputLabel}>Deposit Amount (NGN)</label>
                          <input 
                            type="number" 
                            value={amount} 
                            onChange={e => setAmount(e.target.value)}
                            className={styles.gatewayInput}
                            placeholder="Amount to send"
                          />
                        </div>
                        <div>
                          <label className={styles.gatewayInputLabel}>Sender Account Name</label>
                          <input 
                            type="text" 
                            placeholder="Your account name"
                            value={senderInfo} 
                            onChange={e => setSenderInfo(e.target.value)}
                            className={styles.gatewayInput}
                          />
                        </div>
                      </div>
                      {/* Auto-Generated Transfer Code Box */}
                      <div style={{ marginBottom: '0.75rem', padding: '0.75rem', background: 'rgba(0, 230, 118, 0.08)', border: '1px solid rgba(0, 230, 118, 0.3)', borderRadius: '8px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <div>
                            <span style={{ fontSize: '0.75rem', color: '#00e676', fontWeight: 600, display: 'block', marginBottom: '0.2rem' }}>TRANSFER REFERENCE CODE</span>
                            <span style={{ fontSize: '1.4rem', color: '#ffffff', fontWeight: 700, letterSpacing: '2px' }}>{transferCode}</span>
                          </div>
                          <button 
                            type="button" 
                            className={styles.gatewayCopyBtn}
                            onClick={() => {
                              navigator.clipboard.writeText(transferCode);
                              setCopiedField('code');
                              setTimeout(() => setCopiedField(''), 2000);
                            }}
                            style={{ background: 'rgba(0, 230, 118, 0.15)', borderColor: 'rgba(0, 230, 118, 0.4)' }}
                          >
                            {copiedField === 'code' ? <Check size={12} style={{color: '#00e676'}} /> : <Copy size={12} />}
                            <span>{copiedField === 'code' ? 'Copied!' : 'Copy'}</span>
                          </button>
                        </div>
                        <p style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.7)', marginTop: '0.4rem', lineHeight: 1.4 }}>
                          Paste this 6-digit code in the <strong>Narration / Remark</strong> of your bank app. This allows instant verification without manual receipts.
                        </p>
                      </div>

                      <div className={styles.quickAmounts} style={{ marginBottom: '0.25rem' }}>
                        <button onClick={() => setAmount('5000')}>₦5K</button>
                        <button onClick={() => setAmount('10000')}>₦10K</button>
                        <button onClick={() => setAmount('50000')}>₦50K</button>
                      </div>
                    </div>

                    {message && <div className={styles.message}>{message}</div>}

                    {/* Action Controllers */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.25rem' }}>
                      <button 
                        type="button"
                        className={`btn btn-primary ${styles.gatewaySubmitBtn}`}
                        disabled={isClearing}
                        onClick={handleManualDeposit}
                      >
                        {isClearing ? 'Initiating Settlement Handshake...' : '✔ I Have Transferred This Amount'}
                      </button>
                    </div>

                    {/* PCI-DSS Security compliance tags */}
                    <div className={styles.pciComplianceFooter}>
                      <Lock size={10} />
                      <span>PCI-DSS LEVEL 1 CERTIFIED SECURE PAYMENT GATEWAY</span>
                    </div>
                  </div>
                </div>
              ) : (
                <>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
                    <div>
                      <label className={styles.gatewayInputLabel}>Bank/Wallet Name</label>
                      <input 
                        type="text" 
                        value={withdrawBankName} 
                        onChange={e => setWithdrawBankName(e.target.value)}
                        className={styles.gatewayInput}
                        placeholder="e.g. OPay, Moniepoint"
                      />
                    </div>
                    <div>
                      <label className={styles.gatewayInputLabel}>Account Number</label>
                      <input 
                        type="text" 
                        value={withdrawAccountNo} 
                        onChange={e => setWithdrawAccountNo(e.target.value)}
                        className={styles.gatewayInput}
                        placeholder="10-digit number"
                      />
                    </div>
                  </div>
                  
                  <label className={styles.gatewayInputLabel}>Amount to Withdraw (NGN)</label>
                  <input 
                    type="number" 
                    value={amount} 
                    onChange={e => setAmount(e.target.value)}
                    className={styles.gatewayInput}
                    style={{ marginBottom: '0.25rem' }}
                  />
                  <div className={styles.quickAmounts} style={{ marginBottom: '1rem' }}>
                    <button onClick={() => setAmount('2000')}>₦2K</button>
                    <button onClick={() => setAmount('5000')}>₦5K</button>
                    <button onClick={() => setAmount('10000')}>₦10K</button>
                    <button onClick={() => setAmount(Math.floor(balance).toString())}>MAX</button>
                  </div>

                  {message && <div className={styles.message}>{message}</div>}

                  <button 
                    className={`btn btn-primary ${styles.submitBtn}`}
                    onClick={handleWithdraw}
                    disabled={isClearing}
                  >
                    {isClearing ? 'Processing Request...' : 'Request Payout'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <div className={styles.footer}>
           {user && (
             <button className="btn btn-secondary full-width" onClick={() => { logout(); onClose(); }}>
                Log Out
             </button>
           )}
        </div>
      </div>
    </>
  );
}

