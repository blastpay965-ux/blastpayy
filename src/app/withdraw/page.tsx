'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useWallet } from '@/context/WalletContext';
import { useAuth } from '@/context/AuthContext';
import { ArrowLeft, CheckCircle2, Loader2, Landmark } from 'lucide-react';
import styles from './withdraw.module.css';

const NIGERIAN_BANKS = [
  { code: '058', name: 'Guaranty Trust Bank (GTBank)' },
  { code: '057', name: 'Zenith Bank' },
  { code: '50211', name: 'Kuda Bank' },
  { code: '50582', name: 'OPay' },
  { code: '044', name: 'Access Bank' },
  { code: '033', name: 'United Bank for Africa (UBA)' },
  { code: '011', name: 'First Bank of Nigeria' },
  { code: '050', name: 'Ecobank' },
  { code: '50515', name: 'Moniepoint Microfinance Bank' },
  { code: '100033', name: 'PalmPay' }
];

export default function WithdrawPage() {
  const { balance, withdraw } = useWallet();
  const { user } = useAuth();

  const [bank, setBank] = useState('');
  const [accountNumber, setAccountNumber] = useState('');
  const [amount, setAmount] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successReceipt, setSuccessReceipt] = useState<{
    txId: string;
    amount: number;
    bankName: string;
    accountNumber: string;
    accountName: string;
    date: string;
  } | null>(null);

  const [errorMsg, setErrorMsg] = useState('');

  const handleProceedWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');

    const val = parseFloat(amount);
    if (!bank) return setErrorMsg('Please select a payout destination bank.');
    if (accountNumber.length !== 10) return setErrorMsg('Please enter a valid 10-digit account number.');
    if (isNaN(val) || val <= 0) return setErrorMsg('Please enter a valid withdrawal amount.');
    if (val > balance) return setErrorMsg('Insufficient funds in your casino wallet.');

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/withdraw/payout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ accountNumber, bankCode: bank, amount: val }),
      });
      const result = await res.json();

      if (res.ok && result.status === 'success') {
        withdraw(val);
        setSuccessReceipt({
          txId: result.data.reference || `wd-${Date.now()}`,
          amount: val,
          bankName: NIGERIAN_BANKS.find(b => b.code === bank)?.name || 'Payout Bank',
          accountNumber,
          accountName: user?.username ? user.username.toUpperCase() : 'CASINO PLAYER',
          date: new Date().toLocaleString(),
        });
      } else {
        setErrorMsg(result.error || 'Payout transfer failed. Try again.');
      }
    } catch (err) {
      setErrorMsg('Transfer system encountered an error. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className={styles.container}>
      <Link href="/" className={styles.backBtn}>
        <ArrowLeft size={16} /> Back to Lobby
      </Link>

      <div className={styles.card}>
        {!successReceipt ? (
          <>
            <div className={styles.header}>
              <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '0.75rem' }}>
                <Landmark size={48} color="#a367ff" style={{ opacity: 0.9 }} />
              </div>
              <h1>Withdraw Earnings</h1>
              <p>Payout securely to any Nigerian Bank via Transfer</p>
            </div>

            <div className={styles.balanceBox}>
              <span className={styles.balanceLabel}>Available NGN Balance</span>
              <span className={styles.balanceValue}>₦{balance.toFixed(2)}</span>
            </div>

            <form onSubmit={handleProceedWithdrawal}>
              <div className={styles.formGroup}>
                <label>Select Destination Bank</label>
                <select 
                  className={styles.select}
                  value={bank} 
                  onChange={e => setBank(e.target.value)}
                  disabled={isSubmitting}
                >
                  <option value="">Choose Bank...</option>
                  {NIGERIAN_BANKS.map((b) => (
                    <option key={b.code} value={b.code}>{b.name}</option>
                  ))}
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>NUBAN Account Number (10 Digits)</label>
                <input 
                  type="text" 
                  maxLength={10}
                  className={styles.input}
                  placeholder="e.g. 0123456789"
                  value={accountNumber}
                  onChange={e => setAccountNumber(e.target.value.replace(/\D/g, ''))}
                  disabled={isSubmitting}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Withdrawal Amount (NGN)</label>
                <input 
                  type="number" 
                  className={styles.input}
                  placeholder="₦0.00"
                  value={amount}
                  onChange={e => setAmount(e.target.value)}
                  disabled={isSubmitting}
                />
              </div>

              {errorMsg && (
                <div style={{ color: '#ff4444', fontSize: '0.85rem', fontWeight: 600, textAlign: 'center', margin: '0.5rem 0' }}>
                  {errorMsg}
                </div>
              )}

              <button 
                type="submit" 
                className={`btn btn-primary ${styles.btnSubmit}`}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <span style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                    <Loader2 size={18} className="animate-spin" /> Processing Bank Payout...
                  </span>
                ) : 'Confirm Payout Request'}
              </button>
            </form>
          </>
        ) : (
          <div className={styles.successOverlay}>
            <div className={styles.successIcon}>
              <CheckCircle2 size={40} />
            </div>
            <h2 className={styles.successTitle}>Transfer Successful</h2>
            <p className={styles.successText}>
              Your transfer payout request has been processed successfully. Funds should reflect in your bank account shortly.
            </p>

            <div className={styles.receipt}>
              <div className={styles.receiptRow}>
                <span className={styles.receiptLabel}>Transaction Reference</span>
                <span className={styles.receiptVal}>{successReceipt.txId}</span>
              </div>
              <div className={styles.receiptRow}>
                <span className={styles.receiptLabel}>Payout Bank</span>
                <span className={styles.receiptVal}>{successReceipt.bankName}</span>
              </div>
              <div className={styles.receiptRow}>
                <span className={styles.receiptLabel}>Account Number</span>
                <span className={styles.receiptVal}>{successReceipt.accountNumber}</span>
              </div>
              <div className={styles.receiptRow}>
                <span className={styles.receiptLabel}>Account Name</span>
                <span className={styles.receiptVal}>{successReceipt.accountName}</span>
              </div>
              <div className={styles.receiptRow}>
                <span className={styles.receiptLabel}>Status</span>
                <span className={styles.receiptVal} style={{ color: '#00e676', fontWeight: 700 }}>SUCCESSFUL</span>
              </div>
              <div className={styles.receiptRow}>
                <span className={styles.receiptLabel}>Amount Deducted</span>
                <span className={styles.receiptAmount}>- ₦{successReceipt.amount.toFixed(2)}</span>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', width: '100%' }}>
              <button className="btn btn-secondary" onClick={() => {
                setSuccessReceipt(null);
                setAmount('');
                setAccountNumber('');
                setBank('');
              }}>
                Withdraw Again
              </button>
              <Link href="/" className="btn btn-primary" style={{ textDecoration: 'none', textAlign: 'center', lineHeight: '2.5rem' }}>
                Back to Games
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
