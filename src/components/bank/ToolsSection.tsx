'use client';

import { useState } from 'react';
import { Calculator, PiggyBank, ArrowLeftRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

type ActiveTool = 'loan' | 'savings' | 'currency' | null;

const tools = [
  {
    id: 'loan' as const,
    icon: Calculator,
    title: 'Loan Calculator',
    description: 'Calculate your monthly loan payments and total interest with our easy-to-use calculator.',
  },
  {
    id: 'savings' as const,
    icon: PiggyBank,
    title: 'Savings Calculator',
    description: 'See how your savings grow over time with compound interest projections.',
  },
  {
    id: 'currency' as const,
    icon: ArrowLeftRight,
    title: 'Currency Converter',
    description: 'Convert between major world currencies with up-to-date exchange rates.',
  },
];

export default function ToolsSection() {
  const [activeTool, setActiveTool] = useState<ActiveTool>(null);

  // Loan calculator state
  const [loanAmount, setLoanAmount] = useState('250000');
  const [loanRate, setLoanRate] = useState('6.5');
  const [loanTerm, setLoanTerm] = useState('30');

  // Savings calculator state
  const [savingsPrincipal, setSavingsPrincipal] = useState('10000');
  const [savingsRate, setSavingsRate] = useState('4.5');
  const [savingsYears, setSavingsYears] = useState('10');

  // Currency converter state
  const [currencyAmount, setCurrencyAmount] = useState('1000');
  const [fromCurrency, setFromCurrency] = useState('USD');
  const [toCurrency, setToCurrency] = useState('EUR');

  const currencies = ['USD', 'EUR', 'GBP', 'JPY', 'CAD', 'AUD', 'CHF', 'CNY'];

  const exchangeRates: Record<string, number> = {
    USD: 1,
    EUR: 0.92,
    GBP: 0.79,
    JPY: 149.5,
    CAD: 1.36,
    AUD: 1.53,
    CHF: 0.88,
    CNY: 7.24,
  };

  const calculateLoanPayment = () => {
    const P = parseFloat(loanAmount) || 0;
    const r = (parseFloat(loanRate) || 0) / 100 / 12;
    const n = (parseFloat(loanTerm) || 0) * 12;
    if (r === 0) return P / n || 0;
    return (P * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1);
  };

  const calculateSavings = () => {
    const P = parseFloat(savingsPrincipal) || 0;
    const r = (parseFloat(savingsRate) || 0) / 100;
    const t = parseFloat(savingsYears) || 0;
    return P * Math.pow(1 + r, t);
  };

  const convertCurrency = () => {
    const amount = parseFloat(currencyAmount) || 0;
    const fromRate = exchangeRates[fromCurrency] || 1;
    const toRate = exchangeRates[toCurrency] || 1;
    return (amount / fromRate) * toRate;
  };

  return (
    <section className="py-20 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-12">
          <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white">
            Financial Tools
          </h2>
          <p className="mt-4 text-gray-600 dark:text-gray-400 max-w-2xl mx-auto">
            Powerful calculators and tools to help you make informed financial decisions.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {tools.map((tool) => {
            const Icon = tool.icon;
            const isActive = activeTool === tool.id;
            return (
              <div
                key={tool.id}
                className={`border rounded-xl p-6 bg-white dark:bg-[#111827] transition-all hover:border-emerald-500/50 cursor-pointer ${
                  isActive ? 'border-emerald-500 ring-1 ring-emerald-500/20' : 'border-gray-200 dark:border-white/10'
                }`}
                onClick={() => setActiveTool(isActive ? null : tool.id)}
              >
                <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center mb-4">
                  <Icon className="w-6 h-6 text-emerald-500" />
                </div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {tool.title}
                </h3>
                <p className="text-gray-600 dark:text-gray-400 text-sm mt-2">
                  {tool.description}
                </p>
                <Button
                  variant="outline"
                  className="mt-4 border-emerald-500 text-emerald-500 hover:bg-emerald-500 hover:text-white rounded-xl"
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveTool(isActive ? null : tool.id);
                  }}
                >
                  {isActive ? 'Close Tool' : 'Launch Tool'}
                </Button>
              </div>
            );
          })}
        </div>

        {activeTool && (
          <div className="mt-8 p-6 rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-[#111827]">
            {activeTool === 'loan' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Loan Payment Calculator</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Loan Amount ($)</label>
                    <input
                      type="number"
                      value={loanAmount}
                      onChange={(e) => setLoanAmount(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Interest Rate (%)</label>
                    <input
                      type="number"
                      value={loanRate}
                      onChange={(e) => setLoanRate(e.target.value)}
                      step="0.1"
                      className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Term (Years)</label>
                    <input
                      type="number"
                      value={loanTerm}
                      onChange={(e) => setLoanTerm(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Estimated Monthly Payment</p>
                  <p className="text-3xl font-bold text-emerald-500 mt-1">
                    ${calculateLoanPayment().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                </div>
              </div>
            )}

            {activeTool === 'savings' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Savings Growth Calculator</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Initial Deposit ($)</label>
                    <input
                      type="number"
                      value={savingsPrincipal}
                      onChange={(e) => setSavingsPrincipal(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Annual Rate (%)</label>
                    <input
                      type="number"
                      value={savingsRate}
                      onChange={(e) => setSavingsRate(e.target.value)}
                      step="0.1"
                      className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Years</label>
                    <input
                      type="number"
                      value={savingsYears}
                      onChange={(e) => setSavingsYears(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Projected Total Balance</p>
                  <p className="text-3xl font-bold text-emerald-500 mt-1">
                    ${calculateSavings().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </p>
                  <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
                    Interest earned: ${
                      (calculateSavings() - (parseFloat(savingsPrincipal) || 0)).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
                    }
                  </p>
                </div>
              </div>
            )}

            {activeTool === 'currency' && (
              <div className="space-y-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">Currency Converter</h3>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 items-end">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Amount</label>
                    <input
                      type="number"
                      value={currencyAmount}
                      onChange={(e) => setCurrencyAmount(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">From</label>
                    <select
                      value={fromCurrency}
                      onChange={(e) => setFromCurrency(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    >
                      {currencies.map((c) => (
                        <option key={c} value={c} className="bg-gray-900 text-white">{c}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">To</label>
                    <select
                      value={toCurrency}
                      onChange={(e) => setToCurrency(e.target.value)}
                      className="w-full rounded-xl border border-gray-200 dark:border-white/10 bg-white dark:bg-white/5 p-3 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                    >
                      {currencies.map((c) => (
                        <option key={c} value={c} className="bg-gray-900 text-white">{c}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                  <p className="text-sm text-gray-600 dark:text-gray-400">Converted Amount</p>
                  <p className="text-3xl font-bold text-emerald-500 mt-1">
                    {convertCurrency().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} {toCurrency}
                  </p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
