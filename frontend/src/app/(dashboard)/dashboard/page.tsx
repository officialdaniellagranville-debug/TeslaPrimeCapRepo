'use client';

import Link from 'next/link';

const stats = [
  { label: 'Total Balance', value: '$24,580.50', accent: true },
  { label: 'Active Investments', value: '$18,000.00', accent: false },
  { label: 'Total Earnings', value: '$5,432.75', accent: false },
  { label: 'Referral Earnings', value: '$148.25', accent: false },
];

const recentActivity = [
  { date: 'Jul 20, 2026', type: 'Investment Return', amount: '+$216.00', status: 'Completed' },
  { date: 'Jul 19, 2026', type: 'Deposit', amount: '+$5,000.00', status: 'Completed' },
  { date: 'Jul 18, 2026', type: 'Withdrawal', amount: '-$1,050.00', status: 'Pending' },
  { date: 'Jul 17, 2026', type: 'Investment Return', amount: '+$144.00', status: 'Completed' },
  { date: 'Jul 15, 2026', type: 'Deposit', amount: '+$2,000.00', status: 'Failed' },
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

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      {/* Welcome */}
      <div>
        <h2 className="text-2xl lg:text-3xl font-bold text-white">Welcome back, John</h2>
        <p className="text-tesla-gray-400 text-sm mt-1">Here&apos;s your portfolio overview.</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <div
            key={stat.label}
            className={`bg-tesla-gray-900 border border-tesla-gray-700 p-6 ${
              stat.accent ? 'border-t-2 border-t-tesla-red' : ''
            }`}
          >
            <div className="text-tesla-gray-300 text-xs tracking-wider uppercase mb-2">{stat.label}</div>
            <div className="text-2xl font-bold text-white">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* Quick Actions */}
      <div className="flex flex-wrap gap-3">
        <Link
          href="/deposit"
          className="btn-tesla bg-tesla-red text-white px-6 py-3 text-sm font-medium tracking-wide hover:bg-red-700 transition-colors rounded-sm"
        >
          Deposit Funds
        </Link>
        <Link
          href="/investments"
          className="border border-tesla-gray-600 text-white px-6 py-3 text-sm font-medium tracking-wide hover:border-white transition-colors rounded-sm"
        >
          Invest Now
        </Link>
        <Link
          href="/withdraw"
          className="border border-tesla-gray-600 text-white px-6 py-3 text-sm font-medium tracking-wide hover:border-white transition-colors rounded-sm"
        >
          Withdraw
        </Link>
      </div>

      {/* Recent Activity */}
      <div className="bg-tesla-gray-900 border border-tesla-gray-700">
        <div className="px-6 py-4 border-b border-tesla-gray-700">
          <h3 className="text-sm font-medium text-white tracking-wide">Recent Activity</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-tesla-gray-500 uppercase tracking-wider border-b border-tesla-gray-700">
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Type</th>
                <th className="px-6 py-3 font-medium">Amount</th>
                <th className="px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {recentActivity.map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-tesla-gray-700/50 last:border-b-0 hover:bg-tesla-gray-800/50 transition-colors"
                >
                  <td className="px-6 py-4 text-sm text-tesla-gray-300">{row.date}</td>
                  <td className="px-6 py-4 text-sm text-white">{row.type}</td>
                  <td className="px-6 py-4 text-sm font-medium text-white">{row.amount}</td>
                  <td className="px-6 py-4">
                    <StatusBadge status={row.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
