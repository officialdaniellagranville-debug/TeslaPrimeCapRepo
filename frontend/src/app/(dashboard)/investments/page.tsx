'use client';

import { useState } from 'react';

interface Plan {
  name: string;
  min: number;
  max: number;
  daily: number;
  days: number;
  color: string;
}

const plans: Plan[] = [
  { name: 'Basic', min: 200, max: 4999, daily: 0.5, days: 30, color: '#a3a3a3' },
  { name: 'Silver', min: 5000, max: 9999, daily: 0.8, days: 21, color: '#d4d4d4' },
  { name: 'Gold', min: 10000, max: 49999, daily: 1.2, days: 14, color: '#fbbf24' },
  { name: 'Platinum', min: 50000, max: 100000, daily: 1.8, days: 7, color: '#CC0000' },
];

const activeInvestments = [
  { plan: 'Gold', amount: '$15,000.00', daily: '$180.00', remaining: 8, status: 'Active', earned: '$1,260.00' },
  { plan: 'Silver', amount: '$5,000.00', daily: '$40.00', remaining: 14, status: 'Active', earned: '$280.00' },
  { plan: 'Basic', amount: '$2,000.00', daily: '$10.00', remaining: 0, status: 'Completed', earned: '$300.00' },
];

export default function InvestmentsPage() {
  const [selectedPlan, setSelectedPlan] = useState<Plan | null>(null);
  const [investAmount, setInvestAmount] = useState('');
  const [showModal, setShowModal] = useState(false);

  const openModal = (plan: Plan) => {
    setSelectedPlan(plan);
    setInvestAmount('');
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedPlan(null);
    setInvestAmount('');
  };

  const amountNum = parseFloat(investAmount) || 0;
  const dailyReturn = selectedPlan ? (amountNum * selectedPlan.daily) / 100 : 0;
  const totalReturn = dailyReturn * (selectedPlan?.days || 0);

  const isAmountValid = selectedPlan
    ? amountNum >= selectedPlan.min && amountNum <= selectedPlan.max
    : false;

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-white">Investment Plans</h2>
        <p className="text-tesla-gray-400 text-sm mt-1">Choose a plan that suits your investment goals.</p>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {plans.map((plan) => (
          <div
            key={plan.name}
            className="bg-tesla-gray-900 border border-tesla-gray-700 p-6 flex flex-col hover:border-tesla-gray-600 transition-colors"
          >
            <div className="flex items-center gap-2 mb-4">
              <div
                className="w-3 h-3 rounded-sm"
                style={{ backgroundColor: plan.color }}
              />
              <h3 className="text-lg font-bold text-white">{plan.name}</h3>
            </div>

            <div className="space-y-3 flex-1">
              <div>
                <div className="text-[10px] text-tesla-gray-500 uppercase tracking-wider">Investment Range</div>
                <div className="text-sm text-white mt-0.5">${plan.min.toLocaleString()} – ${plan.max.toLocaleString()}</div>
              </div>
              <div>
                <div className="text-[10px] text-tesla-gray-500 uppercase tracking-wider">Daily Return</div>
                <div className="text-sm text-white mt-0.5">{plan.daily}%</div>
              </div>
              <div>
                <div className="text-[10px] text-tesla-gray-500 uppercase tracking-wider">Duration</div>
                <div className="text-sm text-white mt-0.5">{plan.days} Days</div>
              </div>
            </div>

            <button
              onClick={() => openModal(plan)}
              className="btn-tesla mt-6 w-full bg-tesla-red text-white py-2.5 text-sm font-medium tracking-wide hover:bg-red-700 transition-colors rounded-sm"
            >
              Invest Now
            </button>
          </div>
        ))}
      </div>

      {/* Active Investments Table */}
      <div className="bg-tesla-gray-900 border border-tesla-gray-700">
        <div className="px-6 py-4 border-b border-tesla-gray-700">
          <h3 className="text-sm font-medium text-white tracking-wide">My Active Investments</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-tesla-gray-500 uppercase tracking-wider border-b border-tesla-gray-700">
                <th className="px-6 py-3 font-medium">Plan</th>
                <th className="px-6 py-3 font-medium">Amount</th>
                <th className="px-6 py-3 font-medium">Daily Return</th>
                <th className="px-6 py-3 font-medium">Days Remaining</th>
                <th className="px-6 py-3 font-medium">Status</th>
                <th className="px-6 py-3 font-medium">Total Earned</th>
              </tr>
            </thead>
            <tbody>
              {activeInvestments.map((inv, i) => (
                <tr
                  key={i}
                  className="border-b border-tesla-gray-700/50 last:border-b-0 hover:bg-tesla-gray-800/50 transition-colors"
                >
                  <td className="px-6 py-4 text-sm font-medium text-white">{inv.plan}</td>
                  <td className="px-6 py-4 text-sm text-tesla-gray-300">{inv.amount}</td>
                  <td className="px-6 py-4 text-sm text-green-400">+{inv.daily}</td>
                  <td className="px-6 py-4 text-sm text-tesla-gray-300">{inv.remaining}</td>
                  <td className="px-6 py-4">
                    <span
                      className={`text-xs font-medium ${
                        inv.status === 'Active' ? 'text-green-400' : 'text-tesla-gray-400'
                      }`}
                    >
                      {inv.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-sm font-medium text-white">{inv.earned}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Investment Modal */}
      {showModal && selectedPlan && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70" onClick={closeModal} />
          <div className="relative bg-tesla-gray-900 border border-tesla-gray-700 w-full max-w-md p-6 space-y-5">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold text-white">Invest in {selectedPlan.name} Plan</h3>
              <button onClick={closeModal} className="text-tesla-gray-400 hover:text-white transition-colors">
                <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                  <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-tesla-gray-400">
                <span>Range</span>
                <span className="text-white">${selectedPlan.min.toLocaleString()} – ${selectedPlan.max.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-tesla-gray-400">
                <span>Daily Return</span>
                <span className="text-white">{selectedPlan.daily}%</span>
              </div>
              <div className="flex justify-between text-tesla-gray-400">
                <span>Duration</span>
                <span className="text-white">{selectedPlan.days} Days</span>
              </div>
            </div>

            <div>
              <label className="block text-xs text-tesla-gray-400 uppercase tracking-wider mb-2">
                Investment Amount (USD)
              </label>
              <input
                type="number"
                value={investAmount}
                onChange={(e) => setInvestAmount(e.target.value)}
                placeholder={`Min $${selectedPlan.min.toLocaleString()}`}
                className="w-full bg-tesla-gray-800 border border-tesla-gray-700 text-white px-4 py-3 text-sm rounded-sm focus:border-tesla-red focus:ring-0 outline-none"
              />
              {investAmount && !isAmountValid && (
                <p className="text-tesla-red text-xs mt-1">
                  Amount must be between ${selectedPlan.min.toLocaleString()} and ${selectedPlan.max.toLocaleString()}
                </p>
              )}
            </div>

            {amountNum > 0 && (
              <div className="bg-tesla-gray-800 border border-tesla-gray-700 p-4 space-y-2">
                <div className="flex justify-between text-sm text-tesla-gray-400">
                  <span>Estimated Daily Return</span>
                  <span className="text-green-400">+${dailyReturn.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm text-tesla-gray-400">
                  <span>Estimated Total Return</span>
                  <span className="text-white font-medium">${totalReturn.toFixed(2)}</span>
                </div>
              </div>
            )}

            <button
              disabled={!isAmountValid}
              className="btn-tesla w-full bg-tesla-red text-white py-3 text-sm font-medium tracking-wide hover:bg-red-700 transition-colors rounded-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              Confirm Investment
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
