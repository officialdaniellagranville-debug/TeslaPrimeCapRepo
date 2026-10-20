'use client';

import { useState, useEffect } from 'react';

interface PaymentAddress {
  id: string;
  label: string;
  currency: string;
  network: string | null;
  address: string;
  qrCodeUrl: string | null;
}

const giftCardBrands = ['Apple', 'Amazon', 'Google Play', 'iTunes', 'Steam', 'Vanilla', 'Visa', 'Mastercard', 'Nike', 'Walmart', 'Target', 'eBay'];

const currencyMeta: Record<string, { name: string; icon: string; color: string }> = {
  BTC: { name: 'Bitcoin', icon: '\u20BF', color: 'text-orange-400' },
  ETH: { name: 'Ethereum', icon: '\u039E', color: 'text-blue-400' },
  USDT: { name: 'Tether', icon: '\u20AE', color: 'text-green-400' },
  USDC: { name: 'USD Coin', icon: '$', color: 'text-blue-300' },
  BNB: { name: 'Binance Coin', icon: '\u25C9', color: 'text-yellow-400' },
  SOL: { name: 'Solana', icon: '\u25CB', color: 'text-purple-400' },
  XRP: { name: 'Ripple', icon: '\u27D0', color: 'text-gray-300' },
  ADA: { name: 'Cardano', icon: '\u25B3', color: 'text-blue-500' },
  DOGE: { name: 'Dogecoin', icon: '\u0414', color: 'text-yellow-300' },
  LTC: { name: 'Litecoin', icon: '\u0141', color: 'text-gray-400' },
  TRX: { name: 'TRON', icon: '\u25C7', color: 'text-red-400' },
};

export default function DepositPage() {
  const [method, setMethod] = useState<'crypto' | 'gift_card'>('crypto');
  const [selectedCurrency, setSelectedCurrency] = useState('');
  const [paymentAddresses, setPaymentAddresses] = useState<PaymentAddress[]>([]);
  const [addressesLoading, setAddressesLoading] = useState(true);
  const [amount, setAmount] = useState('');
  const [txHash, setTxHash] = useState('');
  const [cardBrand, setCardBrand] = useState('');
  const [cardCode, setCardCode] = useState('');
  const [cardPin, setCardPin] = useState('');
  const [cardImage, setCardImage] = useState<string | null>(null);   // base64 data URL
  const [imageFileName, setImageFileName] = useState<string>('');
  const [imageUploading, setImageUploading] = useState(false);
  const [imageError, setImageError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState('');
  const [error, setError] = useState('');
  const [history, setHistory] = useState<any[]>([]);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Fetch payment addresses from the database
  useEffect(() => {
    fetch('/api/payment-addresses')
      .then(r => r.json())
      .then(d => {
        if (d.success && d.data?.addresses?.length > 0) {
          setPaymentAddresses(d.data.addresses);
          // Auto-select the first currency
          setSelectedCurrency(d.data.addresses[0].currency);
        }
      })
      .catch(() => {})
      .finally(() => setAddressesLoading(false));
  }, []);

  // Get unique currencies from addresses
  const currencies = [...new Set(paymentAddresses.map(a => a.currency))];

  // Get addresses for the selected currency
  const selectedAddresses = paymentAddresses.filter(a => a.currency === selectedCurrency);

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (token) {
      fetch('/api/deposits/history', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.json())
        .then(d => { if (d.success) setHistory(d.data?.deposits || d.data || []); })
        .catch(() => {});
    }
  }, [success]);

  const copyAddress = (addrId: string, address: string) => {
    navigator.clipboard.writeText(address).then(() => {
      setCopiedId(addrId);
      setTimeout(() => setCopiedId(null), 2000);
    });
  };

  const handleImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    setImageError('');
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setImageError('Please upload an image file (PNG, JPG, WEBP)');
      return;
    }
    // Validate file size (max 4MB to allow for base64 expansion to 500KB after compression)
    if (file.size > 4 * 1024 * 1024) {
      setImageError('Image too large. Maximum size is 4MB.');
      return;
    }

    setImageUploading(true);
    try {
      // Read as base64 data URL, then optionally downscale via canvas
      const dataUrl = await readFileAsDataURL(file);
      const compressed = await downscaleImage(dataUrl, 1280, 0.7);
      setCardImage(compressed);
      setImageFileName(file.name);
    } catch (err) {
      console.error('Image upload error:', err);
      setImageError('Failed to process image. Please try a different file.');
    } finally {
      setImageUploading(false);
    }
  };

  const readFileAsDataURL = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  // Downscale image to max dimension and quality to keep base64 under 500KB
  const downscaleImage = (dataUrl: string, maxDim: number, quality: number): Promise<string> => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        let { width, height } = img;
        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = (height / width) * maxDim;
            width = maxDim;
          } else {
            width = (width / height) * maxDim;
            height = maxDim;
          }
        }
        const canvas = document.createElement('canvas');
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (!ctx) { resolve(dataUrl); return; }
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', quality));
      };
      img.onerror = reject;
      img.src = dataUrl;
    });
  };

  const clearImage = () => {
    setCardImage(null);
    setImageFileName('');
    setImageError('');
  };

  const handleSubmit = async () => {
    setError('');
    setSuccess('');
    const token = localStorage.getItem('token');
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;

    if (method === 'crypto') {
      if (!amount || !txHash) { setError('Enter amount and transaction hash'); return; }
      if (!selectedCurrency) { setError('Select a cryptocurrency first'); return; }
      setLoading(true);
      try {
        const res = await fetch('/api/deposits', {
          method: 'POST', headers,
          body: JSON.stringify({ amount: parseFloat(amount), method: 'crypto', cryptoCurrency: selectedCurrency, txHash }),
        });
        const data = await res.json();
        if (data.success) { setSuccess('Crypto deposit submitted! Awaiting confirmation.'); setAmount(''); setTxHash(''); }
        else setError(data.error?.message || 'Failed to submit deposit');
      } catch { setError('Network error'); }
      finally { setLoading(false); }
    } else {
      if (!cardBrand || !cardCode) { setError('Select card brand and enter card code'); return; }
      if (!cardImage) { setError('Please upload a clear photo of the gift card'); return; }
      if (!amount || parseFloat(amount) <= 0) { setError('Enter the card value in USD'); return; }
      setLoading(true);
      try {
        const res = await fetch('/api/deposits', {
          method: 'POST', headers,
          body: JSON.stringify({
            amount: parseFloat(amount),
            method: 'gift_card',
            giftCardType: cardBrand,
            giftCardCode: cardCode,
            giftCardPin: cardPin || undefined,
            giftCardImage: cardImage,
          }),
        });
        const data = await res.json();
        if (data.success) {
          setSuccess('Gift card submitted! Awaiting verification.');
          setCardCode('');
          setCardPin('');
          setAmount('');
          clearImage();
        } else {
          setError(data.error?.message || 'Failed to submit');
        }
      } catch { setError('Network error'); }
      finally { setLoading(false); }
    }
  };

  const statusBadge = (s: string) => {
    const m: Record<string, string> = { confirmed: 'bg-green-900/30 text-green-400', completed: 'bg-green-900/30 text-green-400', pending: 'bg-yellow-900/30 text-yellow-400', pending_verification: 'bg-yellow-900/30 text-yellow-400', rejected: 'bg-red-900/30 text-red-400' };
    return <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${m[s] || 'bg-gray-700/50 text-gray-400'}`}>{s}</span>;
  };

  return (
    <div className="space-y-5">
      <div>
        <h2 className="text-white font-bold text-lg">Deposit Funds</h2>
        <p className="text-gray-500 text-sm mt-0.5">Add funds via cryptocurrency or gift cards</p>
      </div>

      {/* Method Toggle */}
      <div className="flex bg-tesla-card border border-tesla-border rounded-xl p-1">
        <button onClick={() => setMethod('crypto')} className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${method === 'crypto' ? 'bg-[#CC0000] text-white shadow-lg' : 'text-gray-400'}`}>
          <span className="mr-1.5">{'\u20BF'}</span> Cryptocurrency
        </button>
        <button onClick={() => setMethod('gift_card')} className={`flex-1 py-2.5 rounded-lg text-sm font-semibold transition-all ${method === 'gift_card' ? 'bg-[#CC0000] text-white shadow-lg' : 'text-gray-400'}`}>
          <span className="mr-1.5">{'\uD83C\uDF81'}</span> Gift Card
        </button>
      </div>

      {error && <div className="bg-red-900/30 border border-red-800/50 text-red-400 text-sm rounded-lg px-4 py-3">{error}</div>}
      {success && <div className="bg-green-900/30 border border-green-800/50 text-green-400 text-sm rounded-lg px-4 py-3">{success}</div>}

      {/* Crypto Form */}
      {method === 'crypto' && (
        <div className="bg-tesla-card border border-tesla-border rounded-xl p-5 space-y-4">
          {/* Currency Selection */}
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">Select Cryptocurrency</label>
            {addressesLoading ? (
              <div className="text-center text-gray-500 py-4 text-sm">Loading payment addresses...</div>
            ) : currencies.length === 0 ? (
              <div className="text-center text-gray-500 py-4 text-sm">No cryptocurrency payment addresses available. Please contact support.</div>
            ) : (
              <div className={`grid gap-2 ${currencies.length <= 3 ? 'grid-cols-3' : 'grid-cols-3 sm:grid-cols-4'}`}>
                {currencies.map((currency) => {
                  const meta = currencyMeta[currency] || { name: currency, icon: '\u25CF', color: 'text-gray-400' };
                  return (
                    <button key={currency} onClick={() => setSelectedCurrency(currency)} className={`py-3 px-2 rounded-lg text-center transition-all ${selectedCurrency === currency ? 'bg-[#CC0000]/10 border-2 border-[#CC0000]' : 'bg-[#1a1a1a] border-2 border-transparent hover:border-gray-600'}`}>
                      <div className={`text-xl font-bold ${meta.color}`}>{meta.icon}</div>
                      <div className="text-white text-xs font-semibold mt-1">{currency}</div>
                      <div className="text-gray-500 text-[10px]">{meta.name}</div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Wallet Address Display */}
          {selectedCurrency && selectedAddresses.length > 0 && (
            <div className="space-y-3">
              <label className="block text-gray-300 text-sm font-medium">Send to this address</label>
              {selectedAddresses.map((addr) => (
                <div key={addr.id} className="bg-[#111] border border-tesla-border rounded-xl p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-white text-sm font-medium">{addr.label}</span>
                      {addr.network && (
                        <span className="text-[10px] text-gray-400 bg-white/5 px-2 py-0.5 rounded-full">{addr.network}</span>
                      )}
                    </div>
                  </div>

                  {/* QR Code */}
                  {addr.qrCodeUrl && (
                    <div className="flex justify-center">
                      <img src={addr.qrCodeUrl} alt={`${addr.currency} QR Code`} className="w-40 h-40 rounded-lg border border-tesla-border" />
                    </div>
                  )}

                  {/* Address with Copy Button */}
                  <div className="flex items-center gap-2">
                    <div className="flex-1 bg-[#1a1a1a] border border-tesla-border rounded-lg px-3 py-2.5 font-mono text-xs text-gray-300 break-all select-all">
                      {addr.address}
                    </div>
                    <button
                      onClick={() => copyAddress(addr.id, addr.address)}
                      className={`shrink-0 p-2.5 rounded-lg border transition-all ${copiedId === addr.id ? 'bg-green-900/30 border-green-700/50 text-green-400' : 'bg-white/5 border-tesla-border text-gray-400 hover:text-white hover:bg-white/10'}`}
                      title="Copy address"
                    >
                      {copiedId === addr.id ? (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                      ) : (
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2" /><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" /></svg>
                      )}
                    </button>
                  </div>
                  {copiedId === addr.id && (
                    <p className="text-green-400 text-xs">Address copied to clipboard!</p>
                  )}
                </div>
              ))}
            </div>
          )}

          <div>
            <label className="block text-gray-300 text-sm font-medium mb-1.5">Amount (USD)</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Enter amount" className="w-full bg-[#1a1a1a] border border-tesla-border rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#CC0000] transition-colors" />
          </div>
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-1.5">Transaction Hash</label>
            <input type="text" value={txHash} onChange={(e) => setTxHash(e.target.value)} placeholder="Paste your transaction hash" className="w-full bg-[#1a1a1a] border border-tesla-border rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#CC0000] transition-colors font-mono text-xs" />
          </div>
          <button onClick={handleSubmit} disabled={loading || !amount || !txHash} className="w-full bg-[#CC0000] hover:bg-[#a30000] disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors text-sm">
            {loading ? 'Submitting...' : 'Submit Crypto Deposit'}
          </button>
        </div>
      )}

      {/* Gift Card Form */}
      {method === 'gift_card' && (
        <div className="bg-tesla-card border border-tesla-border rounded-xl p-5 space-y-4">
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-2">Gift Card Brand</label>
            <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
              {giftCardBrands.map((b) => (
                <button key={b} onClick={() => setCardBrand(b)} className={`py-2.5 px-1 rounded-lg text-xs font-medium transition-all text-center ${cardBrand === b ? 'bg-[#CC0000]/10 border-2 border-[#CC0000] text-white' : 'bg-[#1a1a1a] border-2 border-transparent text-gray-400 hover:text-white hover:border-gray-600'}`}>
                  {b}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-1.5">Card Code</label>
            <input type="text" value={cardCode} onChange={(e) => setCardCode(e.target.value)} placeholder="Enter gift card code" className="w-full bg-[#1a1a1a] border border-tesla-border rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#CC0000] transition-colors" />
          </div>
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-1.5">PIN (if required)</label>
            <input type="text" value={cardPin} onChange={(e) => setCardPin(e.target.value)} placeholder="Enter PIN" className="w-full bg-[#1a1a1a] border border-tesla-border rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#CC0000] transition-colors" />
          </div>
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-1.5">Card Value (USD)</label>
            <input type="number" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Enter card value" className="w-full bg-[#1a1a1a] border border-tesla-border rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#CC0000] transition-colors" />
          </div>

          {/* Image Upload */}
          <div>
            <label className="block text-gray-300 text-sm font-medium mb-1.5">
              Gift Card Photo <span className="text-red-400">*</span>
              <span className="text-gray-500 text-xs font-normal ml-1">(clear photo of the card front)</span>
            </label>
            {!cardImage ? (
              <label className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-tesla-border rounded-lg cursor-pointer hover:border-[#CC0000]/50 hover:bg-[#CC0000]/5 transition-all">
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#666" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                  <p className="text-gray-400 text-xs mt-2 font-medium">
                    {imageUploading ? 'Processing...' : 'Click to upload gift card photo'}
                  </p>
                  <p className="text-gray-600 text-[10px] mt-1">PNG, JPG, or WEBP (max 4MB)</p>
                </div>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/jpg"
                  onChange={handleImageChange}
                  className="hidden"
                  disabled={imageUploading}
                />
              </label>
            ) : (
              <div className="relative w-full rounded-lg overflow-hidden border border-tesla-border bg-[#1a1a1a]">
                <img src={cardImage} alt="Gift card preview" className="w-full max-h-48 object-contain bg-black/30" />
                <div className="absolute top-2 right-2 flex gap-2">
                  <button
                    type="button"
                    onClick={clearImage}
                    className="w-8 h-8 bg-black/70 rounded-full flex items-center justify-center text-white hover:bg-red-900/70 transition-colors"
                    title="Remove image"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
                  </button>
                </div>
                <div className="px-3 py-2 text-xs text-gray-400 truncate">
                  {imageFileName} <span className="text-green-400 ml-1">Uploaded</span>
                </div>
              </div>
            )}
            {imageError && <p className="text-red-400 text-xs mt-1.5">{imageError}</p>}
          </div>

          <button onClick={handleSubmit} disabled={loading || !cardBrand || !cardCode || !cardImage || !amount} className="w-full bg-[#CC0000] hover:bg-[#a30000] disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors text-sm">
            {loading ? 'Submitting...' : 'Submit Gift Card'}
          </button>
        </div>
      )}

      {/* History */}
      <div>
        <h3 className="text-white font-semibold text-sm mb-3">Deposit History</h3>
        <div className="bg-tesla-card border border-tesla-border rounded-xl overflow-hidden">
          {history.length === 0 ? (
            <div className="text-center text-gray-500 py-10 text-sm">No deposits yet</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="border-b border-tesla-border">
                  <th className="text-left text-gray-500 font-medium px-4 py-3">Date</th>
                  <th className="text-left text-gray-500 font-medium px-4 py-3">Method</th>
                  <th className="text-right text-gray-500 font-medium px-4 py-3">Amount</th>
                  <th className="text-right text-gray-500 font-medium px-4 py-3">Status</th>
                </tr></thead>
                <tbody>
                  {history.map((d: any) => (
                    <tr key={d.id} className="border-b border-tesla-border/50 last:border-0">
                      <td className="text-gray-300 px-4 py-3 text-xs whitespace-nowrap">{new Date(d.createdAt).toLocaleDateString()}</td>
                      <td className="text-white px-4 py-3 capitalize text-xs">{d.method === 'gift_card' ? `Gift Card` : d.cryptoCurrency || d.method}</td>
                      <td className="text-green-400 px-4 py-3 text-right font-medium">${d.amount?.toLocaleString()}</td>
                      <td className="px-4 py-3 text-right">{statusBadge(d.status)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
</div>
  );
}
