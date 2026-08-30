'use client';

import { useState, useEffect } from 'react';
import {
  Wallet,
  PiggyBank,
  TrendingUp,
  CreditCard,
  ArrowUpRight,
  ArrowDownRight,
  Send,
  Receipt,
  Plus,
  MoreHorizontal,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

const statCards = [
  {
    label: 'Checking',
    amount: '$12,450.00',
    change: '+2.4%',
    positive: true,
    icon: Wallet,
  },
  {
    label: 'Savings',
    amount: '$45,230.50',
    change: '+5.1%',
    positive: true,
    icon: PiggyBank,
  },
  {
    label: 'Investments',
    amount: '$128,900.00',
    change: '+8.3%',
    positive: true,
    icon: TrendingUp,
  },
  {
    label: 'Credit Card',
    amount: '-$2,340.75',
    change: '-1.2%',
    positive: false,
    icon: CreditCard,
  },
];

const spendingData = [
  { category: 'Housing', amount: '$2,400', percent: 60, color: 'bg-emerald-500' },
  { category: 'Food', amount: '$850', percent: 21, color: 'bg-emerald-400' },
  { category: 'Transport', amount: '$380', percent: 10, color: 'bg-teal-500' },
  { category: 'Entertainment', amount: '$220', percent: 5.5, color: 'bg-teal-400' },
  { category: 'Utilities', amount: '$150', percent: 3.8, color: 'bg-cyan-500' },
];

const loanAmortization = [
  { month: 'Jan 2025', payment: '$2,528', principal: '$1,355', interest: '$1,173', balance: '$248,645' },
  { month: 'Feb 2025', payment: '$2,528', principal: '$1,362', interest: '$1,166', balance: '$247,283' },
  { month: 'Mar 2025', payment: '$2,528', principal: '$1,369', interest: '$1,159', balance: '$245,914' },
  { month: 'Apr 2025', payment: '$2,528', principal: '$1,376', interest: '$1,152', balance: '$244,538' },
  { month: 'May 2025', payment: '$2,528', principal: '$1,383', interest: '$1,145', balance: '$243,155' },
];

const transactions = [
  { date: 'Jan 15', description: 'Salary Deposit', category: 'Income', amount: '+$5,200.00', positive: true },
  { date: 'Jan 14', description: 'Whole Foods Market', category: 'Groceries', amount: '-$87.42', positive: false },
  { date: 'Jan 13', description: 'Netflix Subscription', category: 'Entertainment', amount: '-$15.99', positive: false },
  { date: 'Jan 12', description: 'Freelance Payment', category: 'Income', amount: '+$1,500.00', positive: true },
  { date: 'Jan 11', description: 'Electric Company', category: 'Utilities', amount: '-$125.00', positive: false },
];

const quickActions = [
  { label: 'Transfer', icon: Send },
  { label: 'Pay Bills', icon: Receipt },
  { label: 'Deposit', icon: Plus },
  { label: 'More', icon: MoreHorizontal },
];

export default function DashboardSection() {
  const [animatedBars, setAnimatedBars] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setAnimatedBars(true), 300);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">
              Welcome back, <span className="text-emerald-500">Alex</span>
            </h1>
            <p className="text-gray-500 dark:text-gray-400 mt-1">Here is your financial overview</p>
          </div>
          <Badge className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20 text-sm px-3 py-1">
            Premium Account
          </Badge>
        </div>

        {/* Stat Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <div
                key={stat.label}
                className="border border-gray-200 dark:border-white/10 rounded-xl p-4 bg-white dark:bg-[#111827]"
              >
                <div className="flex items-center justify-between mb-3">
                  <div className="w-9 h-9 rounded-lg bg-emerald-500/10 flex items-center justify-center">
                    <Icon className="w-4 h-4 text-emerald-500" />
                  </div>
                  <span className={`text-xs font-medium flex items-center gap-0.5 ${stat.positive ? 'text-emerald-500' : 'text-red-500'}`}>
                    {stat.positive ? <ArrowUpRight className="w-3 h-3" /> : <ArrowDownRight className="w-3 h-3" />}
                    {stat.change}
                  </span>
                </div>
                <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{stat.amount}</p>
              </div>
            );
          })}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Spending Overview */}
          <div className="border border-gray-200 dark:border-white/10 rounded-xl p-6 bg-white dark:bg-[#111827]">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Spending Overview</h3>
            <div className="space-y-4">
              {spendingData.map((item) => (
                <div key={item.category}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="text-gray-600 dark:text-gray-400">{item.category}</span>
                    <span className="font-medium text-gray-900 dark:text-white">{item.amount}</span>
                  </div>
                  <div className="w-full h-7 bg-gray-100 dark:bg-white/5 rounded-lg overflow-hidden">
                    <div
                      className={`h-full ${item.color} rounded-lg transition-all duration-1000 ease-out`}
                      style={{ width: animatedBars ? `${item.percent}%` : '0%' }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Loan Amortization */}
          <div className="border border-gray-200 dark:border-white/10 rounded-xl p-6 bg-white dark:bg-[#111827]">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Loan Amortization</h3>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-white/10">
                    <th className="text-left py-2 pr-3 text-gray-500 dark:text-gray-400 font-medium">Month</th>
                    <th className="text-right py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">Payment</th>
                    <th className="text-right py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">Principal</th>
                    <th className="text-right py-2 px-3 text-gray-500 dark:text-gray-400 font-medium">Interest</th>
                    <th className="text-right py-2 pl-3 text-gray-500 dark:text-gray-400 font-medium">Balance</th>
                  </tr>
                </thead>
                <tbody>
                  {loanAmortization.map((row) => (
                    <tr key={row.month} className="border-b border-gray-100 dark:border-white/5 last:border-b-0">
                      <td className="py-2.5 pr-3 text-gray-700 dark:text-gray-300">{row.month}</td>
                      <td className="py-2.5 px-3 text-right text-gray-900 dark:text-white font-medium">{row.payment}</td>
                      <td className="py-2.5 px-3 text-right text-gray-900 dark:text-white">{row.principal}</td>
                      <td className="py-2.5 px-3 text-right text-gray-500 dark:text-gray-400">{row.interest}</td>
                      <td className="py-2.5 pl-3 text-right text-gray-900 dark:text-white font-medium">{row.balance}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Recent Transactions */}
        <div className="border border-gray-200 dark:border-white/10 rounded-xl p-6 bg-white dark:bg-[#111827]">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-6">Recent Transactions</h3>
          <div className="space-y-3">
            {transactions.map((tx, idx) => (
              <div key={idx} className="flex items-center justify-between py-3 border-b border-gray-100 dark:border-white/5 last:border-b-0">
                <div className="flex items-center gap-4">
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center ${tx.positive ? 'bg-emerald-500/10' : 'bg-red-500/10'}`}>
                    {tx.positive ? (
                      <ArrowDownRight className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <ArrowUpRight className="w-4 h-4 text-red-500" />
                    )}
                  </div>
                  <div>
                    <p className="font-medium text-gray-900 dark:text-white text-sm">{tx.description}</p>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-gray-400 dark:text-gray-500">{tx.date}</span>
                      <Badge variant="secondary" className="text-xs h-4 bg-gray-100 dark:bg-white/10 text-gray-500 dark:text-gray-400 px-1.5">
                        {tx.category}
                      </Badge>
                    </div>
                  </div>
                </div>
                <span className={`font-semibold text-sm ${tx.positive ? 'text-emerald-500' : 'text-red-500'}`}>
                  {tx.amount}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Quick Actions */}
        <div className="flex flex-wrap gap-3">
          {quickActions.map((action) => {
            const Icon = action.icon;
            return (
              <Button
                key={action.label}
                variant="outline"
                className="rounded-xl border-gray-200 dark:border-white/10 bg-white dark:bg-[#111827] hover:border-emerald-500/50 hover:bg-emerald-500/5 flex items-center gap-2 px-5 py-2.5"
              >
                <Icon className="w-4 h-4 text-emerald-500" />
                <span className="text-gray-700 dark:text-gray-300">{action.label}</span>
              </Button>
            );
          })}
        </div>
      </div>
    </section>
  );
}
