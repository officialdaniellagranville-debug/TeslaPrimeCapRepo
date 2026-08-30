'use client';

import { useState } from 'react';

const referralCode = 'JOHN8472';
const referralLink = 'https://teslaprimecapital.com/register?ref=JOHN8472';

const refStats = [
  { label: 'Total Referrals', value: '12' },
  { label: 'Active Referrals', value: '8' },
  { label: 'Total Commission Earned', value: '$148.25' },
];

const referralList = [
  { user: 'alex***@gmail.com', date: 'Jul 15, 2026', status: 'Active', commission: '$24.00' },
  { user: 'maria***@yahoo.com', date: 'Jul 10, 2026', status: 'Active', commission: '$18.50' },
  { user: 'james***@outlook.com', date: 'Jul 05, 2026', status: 'Active', commission: '$32.00' },
  { user: 'sara***@gmail.com', date: 'Jun 28, 2026', status: 'Inactive', commission: '$0.00' },
  { user: 'mike***@proton.me', date: 'Jun 20, 2026', status: 'Active', commission: '$73.75' },
];

export default function ReferralPage() {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const handleCopy = (text: string, type: 'code' | 'link') => {
    navigator.clipboard.writeText(text).catch(() => {});
    if (type === 'code') {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 2000);
    } else {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white">Referral Program</h2>
        <p className="text-tesla-gray-400 text-sm mt-1">Earn commissions by inviting others to invest with Tesla Prime Capital.</p>
      </div>

      {/* Referral Code & Link */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-tesla-gray-900 border border-tesla-gray-700 p-6">
          <div className="text-xs text-tesla-gray-400 uppercase tracking-wider mb-3">Your Referral Code</div>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-tesla-gray-800 border border-tesla-gray-700 px-4 py-3 text-lg font-mono font-bold text-white tracking-widest rounded-sm">
              {referralCode}
            </div>
            <button
              onClick={() => handleCopy(referralCode, 'code')}
              className="px-4 py-3 bg-tesla-gray-800 border border-tesla-gray-700 text-white text-sm hover:border-tesla-gray-600 transition-colors rounded-sm whitespace-nowrap"
            >
              {copiedCode ? 'Copied!' : 'Copy Code'}
            </button>
          </div>
        </div>

        <div className="bg-tesla-gray-900 border border-tesla-gray-700 p-6">
          <div className="text-xs text-tesla-gray-400 uppercase tracking-wider mb-3">Your Referral Link</div>
          <div className="flex items-center gap-3">
            <div className="flex-1 bg-tesla-gray-800 border border-tesla-gray-700 px-4 py-3 text-sm text-tesla-gray-300 font-mono truncate rounded-sm">
              {referralLink}
            </div>
            <button
              onClick={() => handleCopy(referralLink, 'link')}
              className="px-4 py-3 bg-tesla-gray-800 border border-tesla-gray-700 text-white text-sm hover:border-tesla-gray-600 transition-colors rounded-sm whitespace-nowrap"
            >
              {copiedLink ? 'Copied!' : 'Copy Link'}
            </button>
          </div>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {refStats.map((stat) => (
          <div key={stat.label} className="bg-tesla-gray-900 border border-tesla-gray-700 p-6">
            <div className="text-tesla-gray-400 text-xs tracking-wider uppercase">{stat.label}</div>
            <div className="text-2xl font-bold text-white mt-1">{stat.value}</div>
          </div>
        ))}
      </div>

      {/* How It Works */}
      <div>
        <h3 className="text-lg font-bold text-white mb-4">How It Works</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            { num: '01', title: 'Share Your Link', desc: 'Send your unique referral link to friends and family.' },
            { num: '02', title: 'They Register & Invest', desc: 'When they sign up and make their first deposit, you earn.' },
            { num: '03', title: 'Earn Commission', desc: 'Receive a percentage of their investment earnings automatically.' },
          ].map((step) => (
            <div key={step.num} className="bg-tesla-gray-900 border border-tesla-gray-700 p-6">
              <div className="text-3xl font-bold text-tesla-red mb-3">{step.num}</div>
              <h4 className="text-sm font-medium text-white mb-1">{step.title}</h4>
              <p className="text-xs text-tesla-gray-400 leading-relaxed">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Referral List */}
      <div className="bg-tesla-gray-900 border border-tesla-gray-700">
        <div className="px-6 py-4 border-b border-tesla-gray-700">
          <h3 className="text-sm font-medium text-white tracking-wide">Your Referrals</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-tesla-gray-500 uppercase tracking-wider border-b border-tesla-gray-700">
                <th className="px-6 py-3 font-medium">Referred User</th>
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Commission</th>
              </tr>
            </thead>
            <tbody>
              {referralList.map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-tesla-gray-700/50 last:border-b-0 hover:bg-tesla-gray-800/50 transition-colors"
                >
                  <td className="px-6 py-4 text-sm text-white font-mono">{row.user}</td>
                  <td className="px-6 py-4 text-sm text-tesla-gray-300">{row.date}</td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-medium ${row.status === 'Active' ? 'text-green-400' : 'text-tesla-gray-500'}`}>
                      {row.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-white">{row.commission}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
