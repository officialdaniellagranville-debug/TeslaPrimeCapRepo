'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuthStore } from '@/store/useAuthStore';

interface Transaction {
  id: string;
  type: string;
  amount: number;
  status: string;
  description: string;
  createdAt: string;
}

interface PaginatedResponse {
  success: boolean;
  data: {
    transactions: Transaction[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
    };
  };
}

type FilterKey = 'all' | 'deposit' | 'withdrawal' | 'investment' | 'investment_return' | 'referral_bonus';

const filters: { key: FilterKey; label: string }[] = [
  { key: 'all', label: 'All' },
  { key: 'deposit', label: 'Deposits' },
  { key: 'withdrawal', label: 'Withdrawals' },
  { key: 'investment', label: 'Investments' },
  { key: 'investment_return', label: 'Returns' },
  { key: 'referral_bonus', label: 'Referrals' },
];

function typeConfig(type: string) {
  const t = (type || '').toLowerCase();
  switch (t) {
    case 'deposit':
      return { label: 'Deposit', letter: 'D', bg: 'bg-green-600', textColor: 'text-green-400' };
    case 'withdrawal':
      return { label: 'Withdrawal', letter: 'W', bg: 'bg-yellow-600', textColor: 'text-yellow-400' };
    case 'investment':
      return { label: 'Investment', letter: 'I', bg: 'bg-blue-600', textColor: 'text-blue-400' };
    case 'investment_return':
      return { label: 'Return', letter: 'R', bg: 'bg-purple-600', textColor: 'text-purple-400' };
    case 'referral_bonus':
      return { label: 'Referral', letter: 'F', bg: 'bg-amber-600', textColor: 'text-amber-400' };
    case 'balance_adjustment':
      return { label: 'Adjustment', letter: 'A', bg: 'bg-gray-600', textColor: 'text-gray-400' };
    default:
      return { label: type || 'Unknown', letter: '?', bg: 'bg-gray-600', textColor: 'text-gray-400' };
  }
}

function statusColor(status: string) {
  const s = (status || '').toLowerCase();
  if (['completed', 'approved', 'confirmed'].includes(s)) return 'text-green-400';
  if (['pending', 'pending_verification'].includes(s)) return 'text-yellow-400';
  if (['rejected', 'failed'].includes(s)) return 'text-red-400';
  return 'text-gray-400';
}

function statusBg(status: string) {
  const s = (status || '').toLowerCase();
  if (['completed', 'approved', 'confirmed'].includes(s)) return 'bg-green-600/15';
  if (['pending', 'pending_verification'].includes(s)) return 'bg-yellow-600/15';
  if (['rejected', 'failed'].includes(s)) return 'bg-red-600/15';
  return 'bg-gray-600/15';
}

function formatAmount(amount: number, type: string) {
  const isPositive = ['deposit', 'investment_return', 'referral_bonus', 'balance_adjustment'].includes(
    (type || '').toLowerCase()
  );
  const formatted = amount?.toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }) || '0.00';
  return { formatted, isPositive };
}

function formatRelativeTime(dateStr: string) {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMins = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMins < 1) return 'Just now';
  if (diffMins < 60) return `${diffMins}m ago`;
  if (diffHours < 24) return `${diffHours}h ago`;
  if (diffDays < 7) return `${diffDays}d ago`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

export default function TransactionsPage() {
  const { token } = useAuthStore();
  const [activeFilter, setActiveFilter] = useState<FilterKey>('all');
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const limit = 20;

  const fetchTransactions = useCallback(async (p: number, filter: FilterKey) => {
    if (!token) return;
    setLoading(true);
    try {
      const params = new URLSearchParams({
        type: 'live',
        page: String(p),
        limit: String(limit),
      });
      if (filter !== 'all') {
        params.set('txType', filter);
      }
      const res = await fetch(`/api/wallet/transactions?${params.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data: PaginatedResponse = await res.json();
      if (data.success && data.data) {
        setTransactions(data.data.transactions || []);
        setTotalPages(data.data.pagination?.totalPages || 1);
        setTotal(data.data.pagination?.total || 0);
      }
    } catch {
      setTransactions([]);
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchTransactions(page, activeFilter);
  }, [page, activeFilter, fetchTransactions]);

  const handleFilterChange = (key: FilterKey) => {
    setActiveFilter(key);
    setPage(1);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-white font-bold text-lg">Transaction History</h2>
        <p className="text-gray-500 text-sm mt-0.5">
          {total > 0 ? `${total} transaction${total !== 1 ? 's' : ''} found` : 'View your transaction activity'}
        </p>
      </div>

      {/* Filter Pills */}
      <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
        {filters.map((f) => (
          <button
            key={f.key}
            onClick={() => handleFilterChange(f.key)}
            className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap transition-colors shrink-0 ${
              activeFilter === f.key
                ? 'bg-[#CC0000] text-white'
                : 'bg-tesla-card border border-tesla-border text-gray-400 hover:text-white hover:border-gray-500'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="bg-tesla-card border border-tesla-border rounded-xl p-4 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-gray-700 shrink-0" />
                <div className="flex-1">
                  <div className="h-4 bg-gray-800 rounded w-1/3 mb-2" />
                  <div className="h-3 bg-gray-800 rounded w-2/3" />
                </div>
                <div className="text-right">
                  <div className="h-4 bg-gray-800 rounded w-20 mb-2 ml-auto" />
                  <div className="h-3 bg-gray-800 rounded w-14 ml-auto" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : transactions.length === 0 ? (
        <div className="bg-tesla-card border border-tesla-border rounded-xl p-10 text-center">
          <div className="text-gray-600 mb-3">
            <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="mx-auto">
              <rect x="2" y="5" width="20" height="14" rx="2" />
              <path d="M2 10h20" />
            </svg>
          </div>
          <p className="text-gray-500 text-sm">No transactions found</p>
          <p className="text-gray-600 text-xs mt-1">
            {activeFilter !== 'all'
              ? `No ${filters.find((f) => f.key === activeFilter)?.label?.toLowerCase()} transactions yet`
              : 'Your transaction history will appear here'}
          </p>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {transactions.map((tx) => {
              const cfg = typeConfig(tx.type);
              const { formatted, isPositive } = formatAmount(tx.amount, tx.type);
              return (
                <div
                  key={tx.id}
                  className="bg-tesla-card border border-tesla-border rounded-xl p-4 transition-colors"
                >
                  <div className="flex items-center gap-3">
                    {/* Type Icon */}
                    <div
                      className={`w-10 h-10 rounded-full ${cfg.bg} flex items-center justify-center text-white text-sm font-bold shrink-0`}
                    >
                      {cfg.letter}
                    </div>

                    {/* Details */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-white text-sm font-semibold">{cfg.label}</span>
                        <span
                          className={`${statusBg(tx.status)} ${statusColor(tx.status)} text-[10px] font-bold px-2 py-0.5 rounded-full capitalize`}
                        >
                          {tx.status?.replace(/_/g, ' ') || 'Unknown'}
                        </span>
                      </div>
                      <p className="text-gray-500 text-xs mt-0.5 truncate">
                        {tx.description || 'No description'}
                      </p>
                    </div>

                    {/* Amount & Date */}
                    <div className="text-right shrink-0">
                      <p className={`text-sm font-bold ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
                        {isPositive ? '+' : '-'}${formatted}
                      </p>
                      <p className="text-gray-500 text-xs mt-0.5">
                        {formatRelativeTime(tx.createdAt)}
                      </p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between pt-2">
              <button
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={page <= 1}
                className="px-4 py-2 rounded-lg text-sm font-semibold border border-tesla-border text-gray-400 hover:text-white hover:border-gray-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-gray-400 disabled:hover:border-tesla-border"
              >
                Previous
              </button>
              <span className="text-gray-500 text-xs">
                Page {page} of {totalPages}
              </span>
              <button
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={page >= totalPages}
                className="px-4 py-2 rounded-lg text-sm font-semibold border border-tesla-border text-gray-400 hover:text-white hover:border-gray-500 transition-colors disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:text-gray-400 disabled:hover:border-tesla-border"
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
</div>
  );
}
