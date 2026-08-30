'use client';

import { useState } from 'react';

const availableBalance = 24580.50;
const feeRate = 0.21;

const withdrawalHistory = [
  { date: 'Jul 18, 2026', amount: '$1,332.00', fee: '$279.72', received: '$1,052.28', status: 'Pending', wallet: 'bc1q...0wlh' },
  { date: 'Jul 10, 2026', amount: '$2,500.00', fee: '$525.00', received: '$1,975.00', status: 'Completed', wallet: '0x742...bD1A' },
  { date: 'Jun 28, 2026', amount: '$800.00', fee: '$168.00', received: '$632.00', status: 'Completed', wallet: 'TN2Y3...FmQ' },
  { date: 'Jun 15, 2026', amount: '$5,000.00', fee: '$1,050.00', received: '$3,950.00', status: 'Failed', wallet: 'bc1q...xy2k' },
];

function StatusBadge({ status }: { status: string }) {
  const color =
    status === 'Completed'
      ? 'text-green-400'
      : status === 'Pending'
        ? 'text-yellow-400'
        : 'text-tesla-red';
  return <span className={`text-xs font-medium ${color}`}>{status}</span>;
}

export default function WithdrawPage() {
  const [amount, setAmount] = useState('');
  const [walletAddress, setWalletAddress] = useState('');

  const amountNum = parseFloat(amount) || 0;
  const fee = amountNum * feeRate;
  const receive = amountNum - fee;

  const isOverBalance = amountNum > availableBalance;
  const isValid = amountNum > 0 && !isOverBalance && walletAddress.trim().length > 10;

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h2 className="text-2xl font-bold text-white">Withdraw Funds</h2>
        <p className="text-tesla-gray-400 text-sm mt-1">Withdraw your earnings to your crypto wallet.</p>
      </div>

      {/* Available Balance */}
      <div className="bg-tesla-gray-900 border border-tesla-gray-700 p-6">
        <div className="text-xs text-tesla-gray-400 uppercase tracking-wider">Available Balance</div>
        <div className="text-3xl font-bold text-white mt-1">${availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}</div>
      </div>

      {/* Withdrawal Form */}
      <div className="bg-tesla-gray-900 border border-tesla-gray-700 p-6 space-y-5">
        <div>
          <label className="block text-xs text-tesla-gray-400 uppercase tracking-wider mb-2">
            Amount (USD)
          </label>
          <input
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="Enter withdrawal amount"
            className="w-full bg-tesla-gray-800 border border-tesla-gray-700 text-white px-4 py-3 text-sm rounded-sm placeholder-tesla-gray-500"
          />
          {isOverBalance && (
            <p className="text-tesla-red text-xs mt-1">Amount exceeds available balance.</p>
          )}
        </div>

        {/* Fee Calculation */}
        {amountNum > 0 && (
          <div className="bg-tesla-gray-800 border border-tesla-gray-700 p-4 space-y-2">
            <div className="flex justify-between text-sm">
              <span className="text-tesla-gray-400">Withdrawal Fee (21%)</span>
              <span className="text-tesla-red font-medium">-${fee.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-tesla-gray-400">You Receive</span>
              <span className="text-white font-bold">${receive.toFixed(2)}</span>
            </div>
          </div>
        )}

        <div>
          <label className="block text-xs text-tesla-gray-400 uppercase tracking-wider mb-2">
            Wallet Address
          </label>
          <input
            type="text"
            value={walletAddress}
            onChange={(e) => setWalletAddress(e.target.value)}
            placeholder="Enter your crypto wallet address"
            className="w-full bg-tesla-gray-800 border border-tesla-gray-700 text-white px-4 py-3 text-sm rounded-sm placeholder-tesla-gray-500"
          />
        </div>

        <button
          disabled={!isValid}
          className="btn-tesla bg-tesla-red text-white px-8 py-3 text-sm font-medium tracking-wide hover:bg-red-700 transition-colors rounded-sm disabled:opacity-40 disabled:cursor-not-allowed"
        >
          Submit Withdrawal
        </button>
      </div>

      {/* Notice */}
      <div className="border-l-2 border-tesla-red bg-tesla-gray-900 p-4">
        <h4 className="text-sm font-medium text-white mb-1">Important Notice</h4>
        <ul className="text-xs text-tesla-gray-400 space-y-1 list-disc list-inside">
          <li>A withdrawal fee of 21% applies to all withdrawals.</li>
          <li>Withdrawals are processed within 24–48 hours.</li>
          <li>Ensure your wallet address is correct. We are not responsible for incorrect addresses.</li>
          <li>Minimum withdrawal amount is $50.</li>
        </ul>
      </div>

      {/* Withdrawal History */}
      <div className="bg-tesla-gray-900 border border-tesla-gray-700">
        <div className="px-6 py-4 border-b border-tesla-gray-700">
          <h3 className="text-sm font-medium text-white tracking-wide">Withdrawal History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-tesla-gray-500 uppercase tracking-wider border-b border-tesla-gray-700">
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Amount</th>
                <th className="px-6 py-3 font-medium">Fee</th>
                <th className="px-6 py-3 font-medium">Received</th>
                <th className="px-6 py-3 font-medium">Wallet</th>
                <th className="px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {withdrawalHistory.map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-tesla-gray-700/50 last:border-b-0 hover:bg-tesla-gray-800/50 transition-colors"
                >
                  <td className="px-6 py-4 text-sm text-tesla-gray-300">{row.date}</td>
                  <td className="px-6 py-4 text-sm text-white">{row.amount}</td>
                  <td className="px-6 py-4 text-sm text-tesla-red">{row.fee}</td>
                  <td className="px-6 py-4 text-sm font-medium text-white">{row.received}</td>
                  <td className="px-6 py-4 text-sm text-tesla-gray-400 font-mono">{row.wallet}</td>
                  <td className="px-6 py-4"><StatusBadge status={row.status} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
