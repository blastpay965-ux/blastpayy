'use client';

import React, { createContext, useContext, useState, useEffect, useRef, useCallback, ReactNode } from 'react';
import { useAuth } from './AuthContext';
import { getSupabaseBrowser } from '@/lib/supabase-browser';
import { ShieldAlert, Lock, LogOut } from 'lucide-react';

export interface Transaction {
  id: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  currency: string;
  status: 'successful' | 'pending' | 'failed';
  date: string;
}

interface WalletContextType {
  balance: number;
  transactions: Transaction[];
  isFrozen: boolean;
  isBanned: boolean;
  deposit: (amount: number) => Promise<void>;
  withdraw: (amount: number) => Promise<void>;
  deduct: (amount: number) => Promise<boolean>;
  addBalance: (amount: number) => void;     // legacy alias
  deductBalance: (amount: number) => void;  // legacy alias
  syncWallet: () => Promise<void>;
  deductOptimistic: (amount: number) => void;
  isBalanceHidden: boolean;
  toggleHideBalance: () => void;
}

const WalletContext = createContext<WalletContextType | undefined>(undefined);

export const WalletProvider = ({ children }: { children: ReactNode }) => {
  const [balance, setBalance] = useState<number>(0);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [isFrozen, setIsFrozen] = useState(false);
  const [isBanned, setIsBanned] = useState(false);
  const [isBalanceHidden, setIsBalanceHidden] = useState<boolean>(false);
  const { user, logout } = useAuth();
  const realtimeChannelRef = useRef<ReturnType<ReturnType<typeof getSupabaseBrowser>['channel']> | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('hide_balance');
      if (stored === 'true') {
        setIsBalanceHidden(true);
      }
    }
  }, []);

  const toggleHideBalance = useCallback(() => {
    setIsBalanceHidden(prev => {
      const next = !prev;
      if (typeof window !== 'undefined') {
        localStorage.setItem('hide_balance', next ? 'true' : 'false');
      }
      return next;
    });
  }, []);

  // ── Sync wallet from server ───────────────────────────────────────
  const syncWallet = useCallback(async () => {
    if (!user) {
      setBalance(0);
      setTransactions([]);
      setIsFrozen(false);
      setIsBanned(false);
      return;
    }
    try {
      const res = await fetch('/api/wallet/sync');
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance ?? 0);
        setTransactions(data.transactions ?? []);
        setIsFrozen(!!data.isFrozen);
        setIsBanned(!!data.isBanned);
      }
    } catch {
      // ignore network errors
    }
  }, [user]);

  // ── Supabase Realtime — live balance subscription ─────────────────
  useEffect(() => {
    const supabase = getSupabaseBrowser();

    // Clean up any existing channel before creating a new one
    if (realtimeChannelRef.current) {
      supabase.removeChannel(realtimeChannelRef.current);
      realtimeChannelRef.current = null;
    }

    if (!user?.id) {
      setBalance(0);
      setTransactions([]);
      setIsFrozen(false);
      setIsBanned(false);
      return;
    }

    // Initial sync when user changes
    syncWallet();

    // Subscribe to Postgres changes on the profiles row for this user
    const channel = supabase
      .channel(`wallet-${user.id}`)
      .on(
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'profiles',
          filter: `id=eq.${user.id}`,
        },
        (payload: any) => {
          if (payload.new && typeof payload.new.balance !== 'undefined') {
            setBalance(parseFloat(payload.new.balance));
          }
        }
      )
      .subscribe();

    realtimeChannelRef.current = channel;

    // Backup polling: sync wallet every 30 seconds to guarantee realtime updates
    // under all network/realtime replication conditions!
    const pollInterval = setInterval(() => {
      syncWallet();
    }, 30000);

    return () => {
      if (realtimeChannelRef.current) {
        supabase.removeChannel(realtimeChannelRef.current);
        realtimeChannelRef.current = null;
      }
      clearInterval(pollInterval);
    };
  }, [user?.id, syncWallet]);

  // ── Wallet operations ─────────────────────────────────────────────

  const deductOptimistic = (amount: number) => {
    setBalance(prev => Math.max(0, prev - amount));
  };

  const deposit = async (amount: number) => {
    try {
      const res = await fetch('/api/wallet/deposit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });
      if (res.ok) {
        const data = await res.json();
        // Realtime will push the update, but also update locally for instant UI
        setBalance(data.balance);
        setTransactions(data.transactions);
      }
    } catch {
      // ignore
    }
  };

  const deduct = async (amount: number): Promise<boolean> => {
    try {
      const res = await fetch('/api/wallet/deduct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ amount }),
      });
      if (res.ok) {
        const data = await res.json();
        setBalance(data.balance);
        setTransactions(data.transactions);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  };

  // Withdrawal just re-syncs (payout API already deducted on server)
  const withdraw = async (_amount: number) => {
    await syncWallet();
  };

  // Backward-compatible synchronous wrappers used by some game components
  const addBalance = (amount: number) => { deposit(amount); };
  const deductBalance = (amount: number) => { deduct(amount); };

  return (
    <WalletContext.Provider
      value={{ balance, transactions, isFrozen, isBanned, deposit, withdraw, deduct, addBalance, deductBalance, syncWallet, deductOptimistic, isBalanceHidden, toggleHideBalance }}
    >
      {/* GLOBAL BAN/FREEZE NOTIFICATION OVERLAY */}
      {(isBanned || isFrozen) && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          backgroundColor: 'rgba(10, 5, 20, 0.95)',
          backdropFilter: 'blur(10px)',
          zIndex: 99999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '2rem'
        }}>
          <div style={{
            background: 'var(--card-bg)',
            border: `1px solid ${isBanned ? '#ff4444' : '#a367ff'}`,
            borderRadius: '12px',
            padding: '2.5rem',
            maxWidth: '450px',
            textAlign: 'center',
            boxShadow: `0 20px 40px rgba(0,0,0,0.5), 0 0 20px ${isBanned ? 'rgba(255, 68, 68, 0.2)' : 'rgba(163, 103, 255, 0.2)'}`
          }}>
            <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '1.5rem' }}>
              {isBanned ? <ShieldAlert size={64} color="#ff4444" /> : <Lock size={64} color="#a367ff" />}
            </div>
            
            <h2 style={{ fontSize: '1.75rem', marginBottom: '1rem', color: '#fff' }}>
              {isBanned ? 'Account Suspended' : 'Wallet Frozen'}
            </h2>
            
            <p style={{ color: 'var(--text-secondary)', lineHeight: '1.5', marginBottom: '2rem' }}>
              {isBanned 
                ? 'Your account has been permanently suspended due to severe policy violations or suspicious activity. You can no longer access BlastPay services.'
                : 'Your wallet has been temporarily frozen by an administrator. Gameplay and withdrawals are locked until further review.'}
            </p>

            <button 
              onClick={() => logout()}
              className="btn btn-secondary full-width" 
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              <LogOut size={18} /> Sign Out Securely
            </button>
          </div>
        </div>
      )}

      {children}
    </WalletContext.Provider>
  );
};

export const useWallet = () => {
  const context = useContext(WalletContext);
  if (!context) throw new Error('useWallet must be used within a WalletProvider');
  return context;
};
