'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Mail, Download, QrCode, Check, Landmark, Bitcoin } from 'lucide-react';
import ChatWidget from '@/components/ChatWidget';

interface UserData {
  email?: string;
  profile?: {
    firstName?: string;
    lastName?: string;
  };
}

const FALLBACK = {
  accountNumber: '****4521',
  routingNumber: '****7890',
  swiftCode: 'COWEUS33XXX',
  fullName: 'CoreWealth Member',
  email: 'member@corewealth.com',
  btcAddress: 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh',
  ethAddress: '0x71C7656EC7ab88b098defB751B7401B5f6d8976F',
};

export default function ReceiveFundsPage() {
  const [user, setUser] = useState<UserData | null>(null);
  const [activeTab, setActiveTab] = useState<'account' | 'crypto'>('account');
  const [copied, setCopied] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const qrRef = useRef<HTMLDivElement>(null);

  const accountNumber = user?.email ? `CW${user.email.replace(/[^a-z0-9]/gi, '').toUpperCase().slice(0, 12)}` : 'CW*********4521';
  const fullName = user?.profile ? `${user.profile.firstName || ''} ${user.profile.lastName || ''}`.trim() : FALLBACK.fullName;
  const email = user?.email || FALLBACK.email;
  const payUrl = `corewealth://pay/${FALLBACK.accountNumber}`;

  useEffect(() => {
    const token = localStorage.getItem('token');
    if (!token) return;
    fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(d => { if (d.success) setUser(d.data || d.user || d); })
      .catch(() => {});
  }, []);

  const copyToClipboard = useCallback(async (text: string, field: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(field);
      setCopiedField(field);
      setTimeout(() => { setCopied(null); setCopiedField(null); }, 2000);
    } catch {}
  }, []);

  const downloadQR = useCallback(() => {
    const svg = qrRef.current?.querySelector('svg');
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = () => {
      canvas.width = 400;
      canvas.height = 400;
      if (!ctx) return;
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, 400, 400);
      const scale = 360 / img.width;
      ctx.drawImage(img, 20, 20, img.width * scale, img.height * scale);
      const link = document.createElement('a');
      link.download = 'corewealth-qr.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
  }, []);

  const shareViaEmail = useCallback(() => {
    const subject = encodeURIComponent('Payment to CoreWealth Account');
    const body = encodeURIComponent(`Please send payment to:\n\nAccount Number: ${FALLBACK.accountNumber}\nRouting Number: ${FALLBACK.routingNumber}\nSWIFT Code: ${FALLBACK.swiftCode}\nPay Link: ${payUrl}\n\nRecipient: ${fullName}`);
    window.open(`mailto:?subject=${subject}&body=${body}`);
  }, [fullName, payUrl]);

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="text-center">
        <div className="w-14 h-14 mx-auto mb-3 rounded-2xl bg-[#2563EB]/10 border border-[#2563EB]/20 flex items-center justify-center">
          <QrCode className="w-7 h-7 text-[#2563EB]" />
        </div>
        <h2 className="text-white font-bold text-xl">Receive Funds</h2>
        <p className="text-gray-400 text-sm mt-1">Share your QR code or account details to receive payments</p>
      </div>

      {/* User Info */}
      <div className="bg-white/5 border border-white/10 backdrop-blur rounded-xl p-4 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-[#2563EB] flex items-center justify-center text-white text-sm font-bold shrink-0">
          {fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || 'CW'}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-sm truncate">{fullName || FALLBACK.fullName}</p>
          <p className="text-gray-400 text-xs truncate">{email || FALLBACK.email}</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex bg-white/5 border border-white/10 rounded-xl p-1">
        <button
          onClick={() => setActiveTab('account')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'account' ? 'bg-[#2563EB] text-white' : 'text-gray-400 hover:text-white'}`}
        >
          <Landmark className="w-4 h-4" /> Account Details
        </button>
        <button
          onClick={() => setActiveTab('crypto')}
          className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-lg text-sm font-medium transition-all ${activeTab === 'crypto' ? 'bg-[#2563EB] text-white' : 'text-gray-400 hover:text-white'}`}
        >
          <Bitcoin className="w-4 h-4" /> Crypto Address
        </button>
      </div>

      {activeTab === 'account' ? (
        <div className="space-y-5">
          {/* QR Code Card */}
          <div className="bg-white/5 border border-white/10 backdrop-blur rounded-xl p-6">
            <div className="bg-white rounded-2xl p-6 shadow-2xl shadow-[#2563EB]/10 mx-auto max-w-[280px]" ref={qrRef}>
              <QRCodeSVG
                value={payUrl}
                size={220}
                level="H"
                includeMargin={false}
                fgColor="#060A13"
                bgColor="#ffffff"
              />
            </div>

            {/* Account Number with Copy */}
            <div className="mt-5 flex items-center justify-center gap-2">
              <p className="text-white font-mono text-lg tracking-wider">{FALLBACK.accountNumber}</p>
              <button
                onClick={() => copyToClipboard(FALLBACK.accountNumber, 'account')}
                className="w-8 h-8 flex items-center justify-center rounded-lg bg-[#2563EB]/10 hover:bg-[#2563EB]/20 text-[#2563EB] transition-colors"
              >
                {copiedField === 'account' ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Share Options */}
          <div className="grid grid-cols-3 gap-3">
            <button
              onClick={() => copyToClipboard(payUrl, 'link')}
              className="bg-white/5 border border-white/10 backdrop-blur rounded-xl p-4 flex flex-col items-center gap-2 hover:bg-white/10 transition-colors group"
            >
              {copiedField === 'link' ? <Check className="w-5 h-5 text-green-400" /> : <Copy className="w-5 h-5 text-gray-400 group-hover:text-[#60A5FA]" />}
              <span className="text-xs text-gray-400 group-hover:text-white">Copy Link</span>
            </button>
            <button
              onClick={shareViaEmail}
              className="bg-white/5 border border-white/10 backdrop-blur rounded-xl p-4 flex flex-col items-center gap-2 hover:bg-white/10 transition-colors group"
            >
              <Mail className="w-5 h-5 text-gray-400 group-hover:text-[#60A5FA]" />
              <span className="text-xs text-gray-400 group-hover:text-white">Email</span>
            </button>
            <button
              onClick={downloadQR}
              className="bg-white/5 border border-white/10 backdrop-blur rounded-xl p-4 flex flex-col items-center gap-2 hover:bg-white/10 transition-colors group"
            >
              <Download className="w-5 h-5 text-gray-400 group-hover:text-[#60A5FA]" />
              <span className="text-xs text-gray-400 group-hover:text-white">Download</span>
            </button>
          </div>

          {/* Account Details */}
          <div className="bg-white/5 border border-white/10 backdrop-blur rounded-xl p-5 space-y-4">
            <h3 className="text-white font-semibold text-sm">Account Details</h3>
            {[
              { label: 'Account Number', value: FALLBACK.accountNumber },
              { label: 'Routing Number', value: FALLBACK.routingNumber },
              { label: 'SWIFT / BIC Code', value: FALLBACK.swiftCode },
              { label: 'Bank Name', value: 'CoreWealth Bank' },
              { label: 'Account Holder', value: fullName || FALLBACK.fullName },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between py-2 border-b border-white/5 last:border-0">
                <span className="text-gray-400 text-xs">{item.label}</span>
                <div className="flex items-center gap-2">
                  <span className="text-white text-sm font-mono">{item.value}</span>
                  <button
                    onClick={() => copyToClipboard(item.value, item.label)}
                    className="text-gray-500 hover:text-[#60A5FA] transition-colors"
                  >
                    {copiedField === item.label ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <div className="space-y-5">
          {/* BTC QR */}
          <div className="bg-white/5 border border-white/10 backdrop-blur rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-orange-500/10 flex items-center justify-center">
                <Bitcoin className="w-4 h-4 text-orange-400" />
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Bitcoin (BTC)</p>
                <p className="text-gray-500 text-xs">Bitcoin network</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-2xl shadow-[#2563EB]/10 mx-auto max-w-[260px]">
              <QRCodeSVG
                value={`bitcoin:${FALLBACK.btcAddress}`}
                size={200}
                level="H"
                fgColor="#060A13"
                bgColor="#ffffff"
              />
            </div>
            <div className="mt-4 flex items-center justify-center gap-2">
              <p className="text-gray-300 font-mono text-[11px] break-all text-center max-w-[300px]">{FALLBACK.btcAddress}</p>
              <button onClick={() => copyToClipboard(FALLBACK.btcAddress, 'btc')} className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 transition-colors">
                {copiedField === 'btc' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>

          {/* ETH QR */}
          <div className="bg-white/5 border border-white/10 backdrop-blur rounded-xl p-6">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
                <svg width="16" height="16" viewBox="0 0 256 417" fill="none" className="text-blue-400">
                  <path d="M127.961 0l-2.795 9.5v275.668l2.795 2.79 127.962-75.638z" fill="currentColor" opacity=".6"/>
                  <path d="M127.962 0L0 212.32l127.962 75.639V154.158z" fill="currentColor"/>
                  <path d="M127.961 312.187l-1.575 1.92v98.199l1.575 4.6L256 236.587z" fill="currentColor" opacity=".6"/>
                  <path d="M127.962 416.905v-104.72L0 236.585z" fill="currentColor"/>
                </svg>
              </div>
              <div>
                <p className="text-white font-semibold text-sm">Ethereum (ETH)</p>
                <p className="text-gray-500 text-xs">Ethereum network</p>
              </div>
            </div>
            <div className="bg-white rounded-2xl p-6 shadow-2xl shadow-[#2563EB]/10 mx-auto max-w-[260px]">
              <QRCodeSVG
                value={`ethereum:${FALLBACK.ethAddress}`}
                size={200}
                level="H"
                fgColor="#060A13"
                bgColor="#ffffff"
              />
            </div>
            <div className="mt-4 flex items-center justify-center gap-2">
              <p className="text-gray-300 font-mono text-[11px] break-all text-center max-w-[300px]">{FALLBACK.ethAddress}</p>
              <button onClick={() => copyToClipboard(FALLBACK.ethAddress, 'eth')} className="shrink-0 w-7 h-7 flex items-center justify-center rounded-lg bg-white/5 hover:bg-white/10 text-gray-400 transition-colors">
                {copiedField === 'eth' ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
              </button>
            </div>
          </div>
        </div>
      )}

      {copied && (
        <div className="fixed bottom-20 lg:bottom-6 left-1/2 -translate-x-1/2 bg-green-500/10 border border-green-500/20 text-green-400 text-xs font-medium px-4 py-2 rounded-full animate-fade-in">
          <Check className="w-3.5 h-3.5 inline mr-1" /> Copied to clipboard
        </div>
      )}

      <ChatWidget />
    </div>
  );
}
