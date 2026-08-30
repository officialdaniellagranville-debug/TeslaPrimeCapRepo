'use client';

import { useState } from 'react';

type CryptoType = 'BTC' | 'ETH' | 'USDT';

const cryptoOptions: { id: CryptoType; name: string; color: string; address: string; min: string }[] = [
  { id: 'BTC', name: 'Bitcoin', color: '#F7931A', address: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh', min: '$100' },
  { id: 'ETH', name: 'Ethereum', color: '#627EEA', address: '0x742d35Cc6634C0532925a3b844Bc9e7595f2bD1A', min: '$50' },
  { id: 'USDT', name: 'Tether (TRC20)', color: '#26A17B', address: 'TN2Y3cZpZjUZsYY7beoLqJCfB4sE2YfFmQ', min: '$20' },
];

const giftCardTypes = ['Amazon', 'Google Play', 'Apple', 'iTunes', 'Steam', 'Walmart', 'Target', 'Nike'];

const depositHistory = [
  { date: 'Jul 19, 2026', method: 'BTC', amount: '$5,000.00', status: 'Completed' },
  { date: 'Jul 10, 2026', method: 'USDT', amount: '$2,000.00', status: 'Completed' },
  { date: 'Jul 02, 2026', method: 'ETH', amount: '$3,500.00', status: 'Completed' },
  { date: 'Jun 25, 2026', method: 'Gift Card', amount: '$500.00', status: 'Completed' },
];

export default function DepositPage() {
  const [tab, setTab] = useState<'crypto' | 'giftcard'>('crypto');
  const [selectedCrypto, setSelectedCrypto] = useState<CryptoType>('BTC');
  const [txHash, setTxHash] = useState('');
  const [copied, setCopied] = useState(false);

  const [cardType, setCardType] = useState('');
  const [cardValue, setCardValue] = useState('');
  const [cardCode, setCardCode] = useState('');

  const currentCrypto = cryptoOptions.find((c) => c.id === selectedCrypto)!;

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white">Deposit Funds</h2>
        <p className="text-tesla-gray-400 text-sm mt-1">Add funds to your account via cryptocurrency or gift card.</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-tesla-gray-900 border border-tesla-gray-700 w-fit">
        <button
          onClick={() => setTab('crypto')}
          className={`px-6 py-2.5 text-sm font-medium tracking-wide transition-colors rounded-sm ${
            tab === 'crypto'
              ? 'bg-tesla-red text-white'
              : 'text-tesla-gray-400 hover:text-white'
          }`}
        >
          Cryptocurrency
        </button>
        <button
          onClick={() => setTab('giftcard')}
          className={`px-6 py-2.5 text-sm font-medium tracking-wide transition-colors rounded-sm ${
            tab === 'giftcard'
              ? 'bg-tesla-red text-white'
              : 'text-tesla-gray-400 hover:text-white'
          }`}
        >
          Gift Card
        </button>
      </div>

      {tab === 'crypto' ? (
        <div className="space-y-6">
          {/* Crypto Selection */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {cryptoOptions.map((crypto) => (
              <button
                key={crypto.id}
                onClick={() => setSelectedCrypto(crypto.id)}
                className={`bg-tesla-gray-900 border p-4 flex items-center gap-3 transition-colors rounded-sm ${
                  selectedCrypto === crypto.id
                    ? 'border-tesla-red'
                    : 'border-tesla-gray-700 hover:border-tesla-gray-600'
                }`}
              >
                <div
                  className="w-10 h-10 flex items-center justify-center rounded-full text-white font-bold text-xs"
                  style={{ backgroundColor: crypto.color }}
                >
                  {crypto.id}
                </div>
                <div className="text-left">
                  <div className="text-sm font-medium text-white">{crypto.name}</div>
                  <div className="text-xs text-tesla-gray-500">Min: {crypto.min}</div>
                </div>
              </button>
            ))}
          </div>

          {/* Wallet Details */}
          <div className="bg-tesla-gray-900 border border-tesla-gray-700 p-6 space-y-5">
            <div>
              <label className="block text-xs text-tesla-gray-400 uppercase tracking-wider mb-2">
                {currentCrypto.name} Wallet Address
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 bg-tesla-gray-800 border border-tesla-gray-700 px-4 py-3 text-sm text-tesla-gray-300 font-mono truncate rounded-sm">
                  {currentCrypto.address}
                </div>
                <button
                  onClick={() => handleCopy(currentCrypto.address)}
                  className="px-4 py-3 bg-tesla-gray-800 border border-tesla-gray-700 text-white text-sm hover:border-tesla-gray-600 transition-colors rounded-sm whitespace-nowrap"
                >
                  {copied ? 'Copied!' : 'Copy'}
                </button>
              </div>
            </div>

            {/* QR Code Placeholder */}
            <div>
              <label className="block text-xs text-tesla-gray-400 uppercase tracking-wider mb-2">
                QR Code
              </label>
              <div className="w-48 h-48 bg-tesla-gray-800 border border-tesla-gray-700 flex items-center justify-center">
                <span className="text-tesla-gray-500 text-xs">QR Code</span>
              </div>
            </div>

            <div className="text-xs text-tesla-gray-500">
              Minimum deposit: <span className="text-white">{currentCrypto.min}</span>
            </div>

            <div>
              <label className="block text-xs text-tesla-gray-400 uppercase tracking-wider mb-2">
                Transaction Hash
              </label>
              <input
                type="text"
                value={txHash}
                onChange={(e) => setTxHash(e.target.value)}
                placeholder="Enter your transaction hash"
                className="w-full bg-tesla-gray-800 border border-tesla-gray-700 text-white px-4 py-3 text-sm rounded-sm placeholder-tesla-gray-500"
              />
            </div>

            <button className="btn-tesla bg-tesla-red text-white px-8 py-3 text-sm font-medium tracking-wide hover:bg-red-700 transition-colors rounded-sm">
              Submit Deposit
            </button>
          </div>
        </div>
      ) : (
        <div className="bg-tesla-gray-900 border border-tesla-gray-700 p-6 space-y-5 max-w-lg">
          <div>
            <label className="block text-xs text-tesla-gray-400 uppercase tracking-wider mb-2">
              Card Type
            </label>
            <select
              value={cardType}
              onChange={(e) => setCardType(e.target.value)}
              className="w-full bg-tesla-gray-800 border border-tesla-gray-700 text-white px-4 py-3 text-sm rounded-sm appearance-none"
            >
              <option value="">Select card type</option>
              {giftCardTypes.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-tesla-gray-400 uppercase tracking-wider mb-2">
              Card Value (USD)
            </label>
            <input
              type="number"
              value={cardValue}
              onChange={(e) => setCardValue(e.target.value)}
              placeholder="Enter card value"
              className="w-full bg-tesla-gray-800 border border-tesla-gray-700 text-white px-4 py-3 text-sm rounded-sm placeholder-tesla-gray-500"
            />
          </div>

          <div>
            <label className="block text-xs text-tesla-gray-400 uppercase tracking-wider mb-2">
              Card Code
            </label>
            <input
              type="text"
              value={cardCode}
              onChange={(e) => setCardCode(e.target.value)}
              placeholder="Enter card code"
              className="w-full bg-tesla-gray-800 border border-tesla-gray-700 text-white px-4 py-3 text-sm rounded-sm placeholder-tesla-gray-500"
            />
          </div>

          {/* Screenshot Upload */}
          <div>
            <label className="block text-xs text-tesla-gray-400 uppercase tracking-wider mb-2">
              Screenshot
            </label>
            <div className="border-2 border-dashed border-tesla-gray-700 p-8 text-center hover:border-tesla-gray-500 transition-colors cursor-pointer">
              <svg className="w-8 h-8 mx-auto text-tesla-gray-500 mb-2" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <p className="text-sm text-tesla-gray-400">Drag &amp; drop your screenshot here, or click to browse</p>
              <p className="text-xs text-tesla-gray-500 mt-1">PNG, JPG up to 5MB</p>
            </div>
          </div>

          <button className="btn-tesla bg-tesla-red text-white px-8 py-3 text-sm font-medium tracking-wide hover:bg-red-700 transition-colors rounded-sm">
            Submit Gift Card
          </button>
        </div>
      )}

      {/* Deposit History */}
      <div className="bg-tesla-gray-900 border border-tesla-gray-700">
        <div className="px-6 py-4 border-b border-tesla-gray-700">
          <h3 className="text-sm font-medium text-white tracking-wide">Deposit History</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="text-left text-xs text-tesla-gray-500 uppercase tracking-wider border-b border-tesla-gray-700">
                <th className="px-6 py-3 font-medium">Date</th>
                <th className="px-6 py-3 font-medium">Method</th>
                <th className="px-6 py-3 font-medium">Amount</th>
                <th className="px-6 py-3 font-medium">Status</th>
              </tr>
            </thead>
            <tbody>
              {depositHistory.map((row, i) => (
                <tr
                  key={i}
                  className="border-b border-tesla-gray-700/50 last:border-b-0 hover:bg-tesla-gray-800/50 transition-colors"
                >
                  <td className="px-6 py-4 text-sm text-tesla-gray-300">{row.date}</td>
                  <td className="px-6 py-4 text-sm text-white">{row.method}</td>
                  <td className="px-6 py-4 text-sm font-medium text-white">{row.amount}</td>
                  <td className="px-6 py-4 text-xs font-medium text-green-400">{row.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
