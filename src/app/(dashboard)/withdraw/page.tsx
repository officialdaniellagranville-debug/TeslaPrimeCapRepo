'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/useAuthStore';

export default function WithdrawPage() {
  const { user } = useAuthStore();
  const [amount, setAmount] = useState('');
  const [walletAddress, setWalletAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [walletBalance, setWalletBalance] = useState(0);
  const [showConfirm, setShowConfirm] = useState(false);

  const activeWallet = user?.wallets?.find(w => w.type === 'live') || user?.wallets?.[0] || null;
  const balance = activeWallet?.availableBalance || 0;
  const feePercent = 10;
  const numAmount = parseFloat(amount) || 0;
  const fee = (numAmount * feePercent) / 100;
  const net = numAmount - fee;

  const kycLevel = user?.kycLevel || 'LEVEL_0';
  const isLevel3Verified = kycLevel === 'LEVEL_3';

  // Fetch latest wallet balance from API
  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch('/api/wallet', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => {
          if (d.success && d.data) {
            const w = d.data.wallets?.find((w: any) => w.type === 'live') || d.data.wallets?.[0];
            if (w) setWalletBalance(w.availableBalance || 0);
          }
        })
        .catch(() => {});
    }
  }, []);

  const displayBalance = walletBalance > 0 ? walletBalance : balance;

  const handleReview = () => {
    if (!amount || !walletAddress || numAmount > displayBalance || numAmount <= 0) return;
    if (!isLevel3Verified) {
      setError('Please verify Level 3 KYC before proceeding with withdrawals.');
      return;
    }
    setError('');
    setShowConfirm(true);
  };

  const handleConfirm = async () => {
    setShowConfirm(false);
    setError('');
    setSuccess('');
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;
      const res = await fetch('/api/withdrawals', {
        method: 'POST',
        headers,
        body: JSON.stringify({ amount: numAmount, destinationType: 'crypto', destinationAddress: walletAddress }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSuccess('Withdrawal request submitted successfully!');
        setAmount('');
        setWalletAddress('');
      } else {
        setError(data.error?.message || 'Withdrawal failed');
      }
    } catch { setError('Network error. Please try again.'); }
    finally { setLoading(false); }
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-white font-bold text-lg">Withdraw Funds</h2>
        <p className="text-gray-500 text-sm mt-0.5">Request a withdrawal to your crypto wallet</p>
      </div>

      {/* KYC Level 3 required banner */}
      {!isLevel3Verified && (
        <div className="bg-amber-900/20 border border-amber-700/50 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div className="flex items-start gap-3">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#fbbf24" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 flex-shrink-0">
              <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
              <line x1="12" y1="9" x2="12" y2="13" />
              <line x1="12" y1="17" x2="12.01" y2="17" />
            </svg>
            <div>
              <p className="text-amber-300 font-semibold text-sm">Level 3 KYC Required to Withdraw</p>
              <p className="text-amber-200/70 text-xs mt-1">
                Complete all three KYC verification levels to unlock withdrawals. Your current level: <span className="font-semibold">{kycLevel.replace('LEVEL_', 'Level ')}</span>
              </p>
            </div>
          </div>
          <Link
            href="/kyc"
            className="bg-amber-600 hover:bg-amber-500 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors whitespace-nowrap text-center"
          >
            Verify Now
          </Link>
        </div>
      )}

      <div className="bg-tesla-card border border-tesla-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-5">
          <span className="text-gray-400 text-sm">Available Balance</span>
          <span className="text-white text-2xl font-bold">${displayBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
        </div>

        {error && <div className="bg-red-900/30 border border-red-800/50 text-red-400 text-sm rounded-lg px-4 py-3 mb-4">{error}</div>}
        {success && <div className="bg-green-900/30 border border-green-800/50 text-green-400 text-sm rounded-lg px-4 py-3 mb-4">{success}</div>}

        <div className="space-y-4">
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-1.5">Amount (USD)</label>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Enter amount"
              className="w-full bg-[#1a1a1a] border border-tesla-border rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#CC0000] transition-colors"
            />
          </div>

          {numAmount > 0 && numAmount <= displayBalance && (
            <div className="bg-[#1a1a1a] rounded-lg p-3 space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-gray-400">Withdrawal Fee ({feePercent}%)</span><span className="text-red-400 font-medium">-${fee.toFixed(2)}</span></div>
              <div className="flex justify-between"><span className="text-gray-300 font-medium">You Receive</span><span className="text-green-400 font-bold">${net.toFixed(2)}</span></div>
            </div>
          )}

          {numAmount > displayBalance && (
            <p className="text-red-400 text-xs">Insufficient balance</p>
          )}

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-1.5">Wallet Address</label>
            <input
              type="text"
              value={walletAddress}
              onChange={(e) => setWalletAddress(e.target.value)}
              placeholder="Enter your crypto wallet address"
              className="w-full bg-[#1a1a1a] border border-tesla-border rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#CC0000] transition-colors"
            />
          </div>

          <button
            onClick={handleReview}
            disabled={loading || !amount || !walletAddress || numAmount > displayBalance || numAmount <= 0}
            className="w-full bg-[#CC0000] hover:bg-[#a30000] disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors text-sm"
          >
            {loading ? 'Submitting...' : 'Review Withdrawal'}
          </button>
        </div>
      </div>

      {/* ── 2-Step Confirmation Modal ── */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4">
          <div className="absolute inset-0 bg-black/60" onClick={() => setShowConfirm(false)} />
          <div className="relative w-full sm:max-w-md bg-tesla-card border border-tesla-border rounded-t-2xl sm:rounded-2xl overflow-hidden animate-scale-in max-h-[90vh] overflow-y-auto">
            {/* Modal header */}
            <div className="bg-[#CC0000]/10 border-b border-[#CC0000]/20 p-5">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-[#CC0000]/20 flex items-center justify-center">
                  <svg className="w-5 h-5 text-[#CC0000]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-white font-bold text-lg">Confirm Withdrawal</h3>
                  <p className="text-gray-400 text-xs">Please review the details below carefully</p>
                </div>
              </div>
            </div>

            <div className="p-5 space-y-4">
              {/* Warning banner */}
              <div className="bg-amber-900/20 border border-amber-700/40 rounded-lg p-3 flex items-start gap-2.5">
                <svg className="w-4 h-4 text-amber-400 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
                </svg>
                <p className="text-amber-300 text-xs">Withdrawals are irreversible. Please double-check your wallet address before confirming.</p>
              </div>

              {/* Details */}
              <div className="bg-[#1a1a1a] rounded-lg p-4 space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Withdrawal Amount</span>
                  <span className="text-white font-bold">${numAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Withdrawal Fee ({feePercent}%)</span>
                  <span className="text-red-400 font-medium">-${fee.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="border-t border-tesla-border pt-3 flex justify-between text-sm">
                  <span className="text-gray-300 font-medium">You Receive</span>
                  <span className="text-green-400 font-bold text-base">${net.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
              </div>

              {/* Wallet address display */}
              <div className="bg-[#1a1a1a] rounded-lg p-4">
                <span className="text-gray-400 text-xs block mb-1">Destination Wallet</span>
                <p className="text-white text-sm font-mono break-all">{walletAddress}</p>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 pt-1">
                <button
                  onClick={() => setShowConfirm(false)}
                  className="flex-1 bg-[#1a1a1a] border border-tesla-border hover:bg-[#222] text-gray-300 font-semibold py-3 rounded-lg transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirm}
                  className="flex-1 bg-[#CC0000] hover:bg-[#a30000] text-white font-semibold py-3 rounded-lg transition-colors text-sm"
                >
                  Confirm Withdrawal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
</div>
  );
}
