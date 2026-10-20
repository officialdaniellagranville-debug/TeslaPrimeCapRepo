'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import TeslaLogo from '@/components/TeslaLogo';

export default function ForgotPasswordPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [success, setSuccess] = useState(false);
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetError, setResetError] = useState('');
  const [resetFieldErrors, setResetFieldErrors] = useState<Record<string, string>>({});
  const [resetSuccess, setResetSuccess] = useState(false);
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  const handleSendCode = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setError('');
    const errs: Record<string, string> = {};
    if (!email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errs.email = 'Please enter a valid email address';
    setErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setLoading(true);
    try {
      const res = await fetch('/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess(true);
        setTimeout(() => setStep('code'), 1500);
      } else {
        setError(data.error?.message || 'Failed to send reset code');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...code];
    newCode[index] = value.slice(-1);
    setCode(newCode);
    setResetError('');
    setResetFieldErrors(prev => { const n = {...prev}; delete n.code; return n; });
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) inputRefs.current[index - 1]?.focus();
    if (e.key === 'Enter') handleResetPassword();
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newCode = [...code];
    pasted.split('').forEach((char, i) => { if (i < 6) newCode[i] = char; });
    setCode(newCode);
    const nextEmpty = newCode.findIndex(v => !v);
    inputRefs.current[nextEmpty === -1 ? 5 : nextEmpty]?.focus();
  };

  const handleResetPassword = async () => {
    const otp = code.join('');
    setResetError('');
    const errs: Record<string, string> = {};
    if (otp.length !== 6) errs.code = 'Please enter the complete 6-digit code';
    if (!newPassword) errs.newPassword = 'New password is required';
    else if (newPassword.length < 8) errs.newPassword = 'Password must be at least 8 characters';
    else if (!/[A-Z]/.test(newPassword)) errs.newPassword = 'Must contain at least one uppercase letter';
    else if (!/[a-z]/.test(newPassword)) errs.newPassword = 'Must contain at least one lowercase letter';
    else if (!/[0-9]/.test(newPassword)) errs.newPassword = 'Must contain at least one number';
    if (!confirmPassword) errs.confirmPassword = 'Please confirm your new password';
    else if (newPassword !== confirmPassword) errs.confirmPassword = 'Passwords do not match';
    setResetFieldErrors(errs);
    if (Object.keys(errs).length > 0) return;

    setResetLoading(true);
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), code: otp, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setResetSuccess(true);
      } else {
        setResetError(data.error?.message || 'Failed to reset password');
      }
    } catch {
      setResetError('Network error. Please try again.');
    } finally {
      setResetLoading(false);
    }
  };

  // Success screen
  if (resetSuccess) {
    return (
      <div className="min-h-screen bg-tesla-dark flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-900/30 border border-green-700/50 flex items-center justify-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <TeslaLogo className="h-8 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Password Reset</h1>
          <p className="text-gray-400 text-sm mb-8">Your password has been reset successfully. You can now sign in with your new password.</p>
          <Link href="/login" className="inline-block w-full bg-[#CC0000] hover:bg-[#a30000] text-white font-semibold py-3 rounded-lg transition-colors text-sm">
            Sign In Now
          </Link>
        </div>
</div>
    );
  }

  const inputCls = (field?: string) =>
    `w-full bg-[#1a1a1a] border ${field && (errors[field] || resetFieldErrors[field]) ? 'border-red-500' : 'border-tesla-border'} rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#CC0000] transition-colors`;

  return (
    <div className="min-h-screen bg-tesla-dark flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#CC0000]/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <TeslaLogo className="h-14 mx-auto mb-4 drop-shadow-[0_0_15px_rgba(204,0,0,0.3)]" />
          <h1 className="text-2xl font-bold text-white">Reset Password</h1>
          <p className="text-gray-400 text-sm mt-1">
            {step === 'email' ? 'Enter your email to receive a reset code' : 'Enter the code and your new password'}
          </p>
        </div>

        <div className="bg-tesla-card border border-tesla-border rounded-2xl p-6 sm:p-8">
          {/* Step 1: Enter Email */}
          {step === 'email' && (
            <form onSubmit={handleSendCode} className="space-y-4">
              {error && <div className="bg-red-900/30 border border-red-800/50 text-red-400 text-sm rounded-lg px-4 py-3">{error}</div>}
              {success && <div className="bg-green-900/30 border border-green-800/50 text-green-400 text-sm rounded-lg px-4 py-3">Reset code sent! Check your email.</div>}
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1.5">Email Address *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => { setEmail(e.target.value); setErrors(prev => { const n = {...prev}; delete n.email; return n; }); }}
                  placeholder="you@example.com"
                  className={inputCls('email')}
                  autoFocus
                />
                {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
              </div>
              <button type="submit" disabled={loading} className="w-full bg-[#CC0000] hover:bg-[#a30000] disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors text-sm">
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Sending...
                  </span>
                ) : 'Send Reset Code'}
              </button>
            </form>
          )}

          {/* Step 2: Enter Code + New Password */}
          {step === 'code' && (
            <div className="space-y-4">
              {resetError && <div className="bg-red-900/30 border border-red-800/50 text-red-400 text-sm rounded-lg px-4 py-3">{resetError}</div>}
              <p className="text-gray-400 text-xs">Code sent to <span className="text-white">{email}</span></p>

              {/* OTP Inputs */}
              <div className="flex gap-2.5 justify-center" onPaste={handleOtpPaste}>
                {code.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { inputRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    className={`w-12 h-14 bg-[#1a1a1a] border ${resetFieldErrors.code ? 'border-red-500' : 'border-tesla-border'} rounded-lg text-center text-xl font-bold text-white focus:outline-none focus:border-[#CC0000] transition-colors`}
                  />
                ))}
              </div>
              {resetFieldErrors.code && <p className="text-red-400 text-xs text-center">{resetFieldErrors.code}</p>}

              <div className="pt-2">
                <label className="block text-gray-300 text-sm font-medium mb-1.5">New Password *</label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setResetFieldErrors(prev => { const n = {...prev}; delete n.newPassword; return n; }); }}
                  placeholder="Min 8 chars, uppercase, lowercase, number"
                  className={inputCls('newPassword')}
                />
                {resetFieldErrors.newPassword && <p className="text-red-400 text-xs mt-1">{resetFieldErrors.newPassword}</p>}
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1.5">Confirm New Password *</label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => { setConfirmPassword(e.target.value); setResetFieldErrors(prev => { const n = {...prev}; delete n.confirmPassword; return n; }); }}
                  placeholder="Repeat new password"
                  className={inputCls('confirmPassword')}
                />
                {resetFieldErrors.confirmPassword && <p className="text-red-400 text-xs mt-1">{resetFieldErrors.confirmPassword}</p>}
              </div>
              <button
                onClick={handleResetPassword}
                disabled={resetLoading || code.join('').length < 6}
                className="w-full bg-[#CC0000] hover:bg-[#a30000] disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors text-sm"
              >
                {resetLoading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Resetting...
                  </span>
                ) : 'Reset Password'}
              </button>
              <button onClick={() => { setStep('email'); setSuccess(false); setCode(['', '', '', '', '', '']); setNewPassword(''); setConfirmPassword(''); setResetError(''); setResetFieldErrors({}); }} className="w-full text-gray-500 hover:text-gray-300 text-sm">
                Back to email
              </button>
            </div>
          )}
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">
          Remember your password?{' '}
          <Link href="/login" className="text-[#CC0000] hover:underline font-medium">Sign In</Link>
        </p>

        <p className="text-center text-gray-700 text-[10px] mt-4">
          &copy; {new Date().getFullYear()} TeslaPrime. All rights reserved.
        </p>
      </div>
</div>
  );
}
