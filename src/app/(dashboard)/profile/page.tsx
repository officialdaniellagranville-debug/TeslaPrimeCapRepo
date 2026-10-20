'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { useAuthStore } from '@/store/useAuthStore';
import { api } from '@/lib/api';

const menuItems = [
  { label: 'Dashboard', href: '/dashboard', iconPath: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z' },
  { label: 'Investments', href: '/investments', iconPath: 'M22 12h-4l-3 9L9 3l-3 9H2' },
  { label: 'Referrals', href: '/referral', iconPath: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2M9 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8zM23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75' },
  { label: 'KYC Verification', href: '/kyc', iconPath: 'M3 4h18v16H3zM3 10h18' },
  { label: 'Notifications', href: '/notifications', iconPath: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 0 1-3.46 0' },
  { label: 'Transactions', href: '/transactions', iconPath: 'M2 5h20M2 10h20M2 15h20M2 20h20' },
  { label: 'Support', href: '/support', iconPath: 'M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10zM9.09 9a3 3 0 0 1 5.83 1c0 2-3 3-3 3M12 17h.01' },
  { label: 'Transfer to', href: '/withdraw', iconPath: 'M12 5v14M19 12l-7 7-7-7' },
];

function MenuIcon({ d }: { d: string }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <path d={d} />
    </svg>
  );
}

function kycBadgeStyle(level: string) {
  const l = (level || '').toLowerCase();
  if (l === 'level_3' || l === '3') return 'bg-green-600/15 text-green-400';
  if (l === 'level_2' || l === '2') return 'bg-amber-600/15 text-amber-400';
  if (l === 'level_1' || l === '1') return 'bg-blue-600/15 text-blue-400';
  return 'bg-gray-600/15 text-gray-400';
}

function kycLabel(level: string) {
  const l = (level || '').toLowerCase();
  if (l === 'level_3' || l === '3') return 'Level 3';
  if (l === 'level_2' || l === '2') return 'Level 2';
  if (l === 'level_1' || l === '1') return 'Level 1';
  return 'Unverified';
}

export default function ProfilePage() {
  const { user, setUser } = useAuthStore();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  const firstName = user?.profile?.firstName || '';
  const lastName = user?.profile?.lastName || '';
  const fullName = [firstName, lastName].filter(Boolean).join(' ') || user?.email?.split('@')[0] || 'User';
  const initials = [firstName?.charAt(0), lastName?.charAt(0)].filter(Boolean).join('').toUpperCase() || 'U';
  const email = user?.email || '';
  const kycLevel = user?.kycLevel || 'LEVEL_0';
  const activeMode = user?.activeMode || 'demo';
  const avatarUrl = user?.profile?.avatarUrl || null;

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleAvatarChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Client-side validation
    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (!allowedTypes.includes(file.type)) {
      alert('Only JPEG, PNG, and WebP images are allowed.');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      alert('Image must be less than 2MB.');
      return;
    }

    setIsUploading(true);
    try {
      const formData = new FormData();
      formData.append('avatar', file);
      const res = await api.user.avatar(formData);
      if (res.success && res.data?.avatarUrl) {
        setUser({ ...user!, profile: { ...user!.profile, avatarUrl: res.data.avatarUrl } });
      } else {
        alert(res.error?.message || 'Failed to upload avatar.');
      }
    } catch {
      alert('Failed to upload avatar. Please try again.');
    } finally {
      setIsUploading(false);
      // Reset the file input so the same file can be re-selected
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-5">
      {/* User Card */}
      <div className="bg-tesla-card border border-tesla-border rounded-xl p-5 flex items-center gap-4">
        <button
          type="button"
          onClick={handleAvatarClick}
          className="w-16 h-16 rounded-full bg-[#CC0000] flex items-center justify-center text-white text-xl font-bold shrink-0 relative overflow-hidden cursor-pointer hover:ring-2 hover:ring-[#CC0000]/50 transition-all"
          disabled={isUploading}
        >
          {isUploading ? (
            <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : avatarUrl ? (
            <img src={avatarUrl} alt={fullName} className="w-full h-full object-cover" />
          ) : (
            initials
          )}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleAvatarChange}
          />
        </button>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h2 className="text-white font-bold text-lg">{fullName}</h2>
            <span className="bg-[#CC0000]/15 text-[#CC0000] text-[10px] font-bold px-2 py-0.5 rounded-full capitalize">{activeMode === 'live' ? 'Investor' : 'Demo'}</span>
            <span className={`${kycBadgeStyle(kycLevel)} text-[10px] font-bold px-2 py-0.5 rounded-full`}>{kycLabel(kycLevel)}</span>
          </div>
          <p className="text-gray-500 text-sm mt-0.5 truncate">{email}</p>
        </div>
      </div>

      {/* Wallet Balance */}
      <div className="bg-tesla-card border border-tesla-border rounded-xl p-4">
        <p className="text-gray-500 text-xs font-medium mb-1">Account Balance</p>
        {(() => {
          const liveWallet = user?.wallets?.find(w => w.type === 'live');
          const wallet = liveWallet || user?.wallets?.[0];
          return (
            <p className="text-white text-lg font-bold">${wallet?.balance?.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || '0.00'}</p>
          );
        })()}
      </div>

      {/* KYC Verification Level Card */}
      <div className="bg-tesla-card border border-tesla-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-[#CC0000]/10 flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#CC0000" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
            </div>
            <p className="text-white text-sm font-bold">KYC Verification Level</p>
          </div>
          <Link href="/kyc" className="text-[#CC0000] text-xs font-semibold hover:underline">{kycLevel === 'LEVEL_0' ? 'Start Now' : 'View Details'} →</Link>
        </div>
        {/* Level Progress */}
        <div className="flex items-center gap-1 mb-4">
          {['LEVEL_0', 'LEVEL_1', 'LEVEL_2', 'LEVEL_3'].map((level, idx) => {
            const levelNum = { LEVEL_0: 0, LEVEL_1: 1, LEVEL_2: 2, LEVEL_3: 3 }[kycLevel] || 0;
            const isComplete = idx <= levelNum;
            const isCurrent = idx === levelNum;
            const colors = ['bg-gray-600', 'bg-blue-500', 'bg-amber-500', 'bg-green-500'];
            return (
              <div key={level} className="flex-1 flex flex-col items-center gap-1.5">
                <div className={`w-full h-2 rounded-full ${isComplete ? colors[idx] : 'bg-[#222]'} ${isCurrent ? 'ring-2 ring-offset-1 ring-offset-tesla-card ring-white/20' : ''} transition-all`} />
                <span className={`text-[9px] font-medium ${isCurrent ? 'text-white' : 'text-gray-600'}`}>L{idx}</span>
              </div>
            );
          })}
        </div>
        <div className="flex items-center gap-2">
          <span className={`${kycBadgeStyle(kycLevel)} text-xs font-bold px-2.5 py-1 rounded-lg`}>{kycLabel(kycLevel)}</span>
          <p className="text-gray-500 text-[11px] flex-1">
            {kycLevel === 'LEVEL_0' && 'Complete verification to unlock withdrawals and higher limits.'}
            {kycLevel === 'LEVEL_1' && 'Level 1 complete. Submit documents for Level 2.'}
            {kycLevel === 'LEVEL_2' && 'Level 2 complete. Final verification pending.'}
            {kycLevel === 'LEVEL_3' && 'Fully verified. All features unlocked.'}
          </p>
        </div>
      </div>

      {/* Menu */}
      <div className="bg-tesla-card border border-tesla-border rounded-xl overflow-hidden">
        {menuItems.map((item, i) => (
          <Link
            key={item.label}
            href={item.href}
            className={`flex items-center gap-3 px-4 py-3.5 hover:bg-[#2a2a2a] transition-colors ${i < menuItems.length - 1 ? 'border-b border-tesla-border/50' : ''}`}
          >
            <span className="text-gray-400"><MenuIcon d={item.iconPath} /></span>
            <span className="text-white text-sm font-medium flex-1">{item.label}</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6" /></svg>
          </Link>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="grid grid-cols-2 gap-3">
        <Link href="/deposit" className="bg-[#CC0000] hover:bg-[#a30000] text-white text-sm font-semibold py-3 rounded-xl text-center transition-colors">
          Deposit
        </Link>
        <Link href="/withdraw" className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold py-3 rounded-xl text-center transition-colors">
          Withdraw
        </Link>
      </div>
</div>
  );
}
