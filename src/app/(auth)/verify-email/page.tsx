'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import TeslaLogo from '@/components/TeslaLogo';

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const emailParam = searchParams.get('email') || '';

  const [email, setEmail] = useState(emailParam);
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [resendInterval, setResendInterval] = useState<NodeJS.Timeout | null>(null);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Start auto-focus on first OTP input
  useEffect(() => {
    if (email) {
      otpRefs.current[0]?.focus();
    }
  }, [email]);

  const startResendTimer = () => {
    setResendTimer(60);
    if (resendInterval) clearInterval(resendInterval);
    const interval = setInterval(() => {
      setResendTimer((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    setResendInterval(interval);
  };

  const handleSendCode = async (ev: React.FormEvent) => {
    ev.preventDefault();
    setError('');
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Please enter a valid email address');
      return;
    }
    setResendLoading(true);
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), action: 'send' }),
      });
      const data = await res.json();
      if (res.ok) {
        startResendTimer();
      } else {
        setError(data.error?.message || 'Failed to send verification code');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...otpCode];
    newCode[index] = value.slice(-1);
    setOtpCode(newCode);
    setError('');
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) otpRefs.current[index - 1]?.focus();
    if (e.key === 'Enter') handleVerify();
  };

  const handleOtpPaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newCode = [...otpCode];
    pasted.split('').forEach((char, i) => { if (i < 6) newCode[i] = char; });
    setOtpCode(newCode);
    const nextEmpty = newCode.findIndex(v => !v);
    otpRefs.current[nextEmpty === -1 ? 5 : nextEmpty]?.focus();
  };

  const handleVerify = async () => {
    const otp = otpCode.join('');
    if (otp.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), code: otp, action: 'verify' }),
      });
      const data = await res.json();
      if (res.ok && data.data?.verified) {
        setSuccess(true);
        if (resendInterval) clearInterval(resendInterval);
      } else {
        setError(data.error?.message || 'Invalid verification code');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendTimer > 0) return;
    setResendLoading(true);
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), action: 'resend' }),
      });
      const data = await res.json();
      if (res.ok) {
        setOtpCode(['', '', '', '', '', '']);
        setError('');
        startResendTimer();
      } else {
        setError(data.error?.message || 'Failed to resend code');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  // Success screen
  if (success) {
    return (
      <div className="min-h-screen bg-tesla-dark flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-900/30 border border-green-700/50 flex items-center justify-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <TeslaLogo className="h-8 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Email Verified!</h1>
          <p className="text-gray-400 text-sm mb-8">Your email has been verified successfully. Your account is now active.</p>
          <Link href="/login" className="inline-block w-full bg-[#CC0000] hover:bg-[#a30000] text-white font-semibold py-3 rounded-lg transition-colors text-sm">
            Sign In Now
          </Link>
        </div>
</div>
    );
  }

  const inputCls = (hasError?: boolean) =>
    `w-full bg-[#1a1a1a] border ${hasError ? 'border-red-500' : 'border-tesla-border'} rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#CC0000] transition-colors`;

  return (
    <div className="min-h-screen bg-tesla-dark flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#CC0000]/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#CC0000]/10 border border-[#CC0000]/30 flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#CC0000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="M22 7l-10 7L2 7" /></svg>
          </div>
          <TeslaLogo className="h-8 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Verify Your Email</h1>
          <p className="text-gray-400 text-sm">Enter the 6-digit code sent to your email to activate your account</p>
        </div>

        <div className="bg-tesla-card border border-tesla-border rounded-2xl p-6 sm:p-8">
          {error && (
            <div className="bg-red-900/30 border border-red-800/50 text-red-400 text-sm rounded-lg px-4 py-3 mb-5">{error}</div>
          )}

          {/* Email input (if not pre-filled from URL) */}
          {!email && (
            <form onSubmit={handleSendCode} className="space-y-4 mb-6">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1.5">Email Address *</label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="you@example.com"
                  className={inputCls(!!error)}
                  autoFocus
                />
              </div>
              <button type="submit" disabled={resendLoading} className="w-full bg-[#CC0000] hover:bg-[#a30000] disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors text-sm">
                {resendLoading ? 'Sending...' : 'Send Verification Code'}
              </button>
            </form>
          )}

          {/* OTP Inputs */}
          {email && (
            <>
              <p className="text-gray-400 text-xs mb-4">Code sent to <span className="text-white font-medium">{email}</span></p>

              <div className="flex gap-2.5 justify-center mb-6" onPaste={handleOtpPaste}>
                {otpCode.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { otpRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    maxLength={1}
                    value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleOtpKeyDown(i, e)}
                    disabled={loading || success}
                    className={`w-12 h-14 bg-[#1a1a1a] border ${error ? 'border-red-500' : 'border-tesla-border'} rounded-lg text-center text-xl font-bold text-white focus:outline-none focus:border-[#CC0000] transition-colors disabled:opacity-50`}
                  />
                ))}
              </div>

              <button
                onClick={handleVerify}
                disabled={loading || otpCode.join('').length < 6 || success}
                className="w-full bg-[#CC0000] hover:bg-[#a30000] disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors text-sm"
              >
                {loading ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Verifying...
                  </span>
                ) : 'Verify Email'}
              </button>

              {/* Resend */}
              <div className="mt-4 text-center">
                <p className="text-gray-500 text-xs mb-2">Didn&apos;t receive the code?</p>
                <button
                  onClick={handleResend}
                  disabled={resendTimer > 0 || resendLoading || success}
                  className="text-[#CC0000] hover:underline text-sm font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resendLoading ? (
                    'Sending...'
                  ) : resendTimer > 0 ? (
                    `Resend in ${resendTimer}s`
                  ) : (
                    'Resend Code'
                  )}
                </button>
              </div>
            </>
          )}
        </div>

        <p className="text-center text-gray-500 text-sm mt-6">
          <Link href="/login" className="text-[#CC0000] hover:underline font-medium">Back to Sign In</Link>
        </p>

        <p className="text-center text-gray-700 text-[10px] mt-4">
          &copy; {new Date().getFullYear()} TeslaPrime. All rights reserved.
        </p>
      </div>
</div>
  );
}
