'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/store/useAuthStore';
import TeslaLogo from '@/components/TeslaLogo';
import TurnstileWidget from '@/components/TurnstileWidget';

export default function LoginPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setAuth = useAuthStore((s) => s.setAuth);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  // 2FA state
  const [requires2FA, setRequires2FA] = useState(false);
  const [pendingToken, setPendingToken] = useState<string | null>(null);
  const [twoFaEmail, setTwoFaEmail] = useState('');
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [resendLoading, setResendLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(0);
  const [resendInterval, setResendInterval] = useState<NodeJS.Timeout | null>(null);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Load saved email (client-side only)
  useEffect(() => {
    try {
      const saved = localStorage.getItem('remembered_email');
      if (saved) { setEmail(saved); setRememberMe(true); }
    } catch {}
  }, []);

  // Cleanup resend timer on unmount
  useEffect(() => {
    return () => {
      if (resendInterval) clearInterval(resendInterval);
    };
  }, [resendInterval]);

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

  const validateForm = () => {
    const e: Record<string, string> = {};
    if (!email.trim()) e.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) e.email = 'Please enter a valid email address';
    if (!password) e.password = 'Password is required';
    else if (password.length < 6) e.password = 'Password must be at least 6 characters';
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const doLogin = async () => {
    setError('');
    if (!validateForm()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password, captchaToken: captchaToken || undefined }),
      });
      const data = await res.json();

      if (res.ok && data.success && data.data) {
        // Check if 2FA is required
        if (data.data.requires2FA) {
          setRequires2FA(true);
          setPendingToken(data.data.pendingToken);
          setTwoFaEmail(data.data.email);
          // Automatically trigger OTP send
          handleSend2faOtp(data.data.email);
          setLoading(false);
          return;
        }

        if (data.data.token) {
          // Save remembered email
          if (rememberMe) {
            localStorage.setItem('remembered_email', email);
          } else {
            localStorage.removeItem('remembered_email');
          }

          setAuth(data.data.user, data.data.token);
          localStorage.setItem('user', JSON.stringify(data.data.user));
          if (data.data.user?.adminRecord) {
            router.push('/admin');
          } else {
            router.push('/dashboard');
          }
        }
      } else {
        setError(data.error?.message || 'Invalid credentials. Please try again.');
        // Handle unverified email — redirect to verify page
        if (data.error?.code === 'EMAIL_NOT_VERIFIED' && data.error?.email) {
          router.push(`/verify-email?email=${encodeURIComponent(data.error.email)}`);
        }
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSend2faOtp = async (emailAddr?: string) => {
    const targetEmail = emailAddr || twoFaEmail;
    setResendLoading(true);
    try {
      await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: targetEmail, action: 'send' }),
      });
      startResendTimer();
    } catch {
      // Non-critical — user can still enter code if they received one
    } finally {
      setResendLoading(false);
    }
  };

  const handleVerify2fa = async () => {
    const otp = otpCode.join('');
    if (otp.length !== 6) {
      setVerifyError('Please enter the complete 6-digit code');
      return;
    }
    setVerifyLoading(true);
    setVerifyError('');
    try {
      const res = await fetch('/api/auth/login/verify-2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ pendingToken, otpCode: otp }),
      });
      const data = await res.json();
      if (res.ok && data.success && data.data?.token) {
        // Save remembered email
        if (rememberMe) {
          localStorage.setItem('remembered_email', email);
        }
        setAuth(data.data.user, data.data.token);
        localStorage.setItem('user', JSON.stringify(data.data.user));
        if (data.data.user?.adminRecord) {
          router.push('/admin');
        } else {
          router.push('/dashboard');
        }
      } else {
        setVerifyError(data.error?.message || 'Invalid verification code. Please try again.');
      }
    } catch {
      setVerifyError('Network error. Please try again.');
    } finally {
      setVerifyLoading(false);
    }
  };

  const handleResendOtp = async () => {
    if (resendTimer > 0 || resendLoading) return;
    await handleSend2faOtp();
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;
    const newCode = [...otpCode];
    newCode[index] = value.slice(-1);
    setOtpCode(newCode);
    setVerifyError('');
    if (value && index < 5) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otpCode[index] && index > 0) otpRefs.current[index - 1]?.focus();
    if (e.key === 'Enter') handleVerify2fa();
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

  const handleBackToLogin = () => {
    setRequires2FA(false);
    setPendingToken(null);
    setTwoFaEmail('');
    setOtpCode(['', '', '', '', '', '']);
    setVerifyError('');
    if (resendInterval) clearInterval(resendInterval);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !requires2FA) doLogin();
  };

  const inputCls = (field: string) =>
    `w-full bg-[#1a1a1a] border ${errors[field] ? 'border-red-500' : 'border-tesla-border'} rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#CC0000] transition-colors`;

  // ── 2FA VERIFICATION SCREEN ──
  if (requires2FA) {
    return (
      <div className="min-h-screen bg-tesla-dark flex flex-col items-center justify-center px-4 py-12 relative overflow-hidden">
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#CC0000]/5 rounded-full blur-[150px] pointer-events-none" />
        <div className="w-full max-w-md relative z-10">
          <div className="text-center mb-8">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-[#CC0000]/10 border border-[#CC0000]/30 flex items-center justify-center">
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#CC0000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                <path d="M7 11V7a5 5 0 0 1 10 0v4" />
              </svg>
            </div>
            <TeslaLogo className="h-8 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-white mb-2">Two-Factor Verification</h1>
            <p className="text-gray-400 text-sm">
              We sent a 6-digit code to <span className="text-white font-medium">{twoFaEmail}</span>
            </p>
          </div>

          <div className="dash-card card-shine noise-overlay !p-6 sm:!p-8 animated-border">
            {verifyError && (
              <div className="bg-red-900/30 border border-red-800/50 text-red-400 text-sm rounded-lg px-4 py-3 mb-5">{verifyError}</div>
            )}

            {/* OTP Inputs */}
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
                  disabled={verifyLoading}
                  className={`w-12 h-14 bg-[#1a1a1a] border ${verifyError ? 'border-red-500' : 'border-tesla-border'} rounded-lg text-center text-xl font-bold text-white focus:outline-none focus:border-[#CC0000] transition-colors disabled:opacity-50`}
                />
              ))}
            </div>

            <button
              onClick={handleVerify2fa}
              disabled={verifyLoading || otpCode.join('').length < 6}
              className="w-full btn-red pulse-ring magnetic-hover text-sm"
            >
              {verifyLoading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                  Verifying...
                </span>
              ) : 'Verify & Sign In'}
            </button>

            {/* Resend */}
            <div className="mt-4 text-center">
              <p className="text-gray-500 text-xs mb-2">Didn&apos;t receive the code?</p>
              <button
                onClick={handleResendOtp}
                disabled={resendTimer > 0 || resendLoading}
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

            {/* Back to login */}
            <button
              onClick={handleBackToLogin}
              className="w-full text-gray-500 hover:text-gray-300 text-sm mt-4"
            >
              Back to login
            </button>
          </div>
        </div>
</div>
    );
  }

  // ── LOGIN FORM ──
  return (
    <div className="min-h-screen bg-tesla-dark flex flex-col items-center justify-center px-4 py-12 page-enter relative overflow-hidden">
      {/* Background glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-[#CC0000]/5 rounded-full blur-[150px] pointer-events-none" />
      <div className="w-full max-w-md relative z-10">
        <div className="text-center mb-8">
          <TeslaLogo className="h-14 mx-auto mb-4 drop-shadow-[0_0_15px_rgba(204,0,0,0.3)]" />
          <h1 className="text-2xl font-bold text-white">Welcome Back</h1>
          <p className="text-gray-400 text-sm mt-1">Sign in to your TeslaPrime account</p>
        </div>

        <div className="dash-card card-shine noise-overlay !p-6 sm:!p-8 animated-border">
          {error && (
            <div className="bg-red-900/30 border border-red-800/50 text-red-400 text-sm rounded-lg px-4 py-3 mb-5">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-1.5">Email Address</label>
              <input
                type="email"
                value={email}
                onChange={(e) => { setEmail(e.target.value); setErrors(prev => { const n = {...prev}; delete n.email; return n; }); }}
                onKeyDown={handleKeyDown}
                placeholder="you@example.com"
                autoComplete="email"
                className={inputCls('email')}
              />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => { setPassword(e.target.value); setErrors(prev => { const n = {...prev}; delete n.password; return n; }); }}
                  onKeyDown={handleKeyDown}
                  placeholder="Enter your password"
                  autoComplete="current-password"
                  className={inputCls('password') + ' pr-11'}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-300"
                >
                  {showPassword ? (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24" /><line x1="1" y1="1" x2="23" y2="23" /></svg>
                  ) : (
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" /><circle cx="12" cy="12" r="3" /></svg>
                  )}
                </button>
              </div>
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={rememberMe}
                onChange={(e) => setRememberMe(e.target.checked)}
                className="accent-[#CC0000] w-3.5 h-3.5"
              />
              <span className="text-gray-400 text-xs">Remember me</span>
            </label>
            <Link href="/forgot-password" className="text-[#CC0000] text-xs hover:underline">Forgot password?</Link>
          </div>

          {/* Cloudflare Turnstile CAPTCHA */}
          <TurnstileWidget
            onToken={(token) => setCaptchaToken(token)}
            onError={() => setCaptchaToken(null)}
            onExpire={() => setCaptchaToken(null)}
          />

          <button
            onClick={doLogin}
            disabled={loading}
            className="w-full mt-6 btn-red pulse-ring magnetic-hover text-sm"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                Signing In...
              </span>
            ) : 'Sign In'}
          </button>

          {/* Security badges */}
          <div className="mt-5 pt-4 border-t border-tesla-border">
            <div className="flex items-center justify-center gap-4">
              <div className="flex items-center gap-1.5 text-gray-600">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
                <span className="text-[10px]">256-bit SSL</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-600">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                <span className="text-[10px]">Secured</span>
              </div>
              <div className="flex items-center gap-1.5 text-gray-600">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
                <span className="text-[10px]">24/7 Support</span>
              </div>
            </div>
          </div>

          <p className="text-center text-gray-500 text-sm mt-5">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-[#CC0000] hover:underline font-medium">Create Account</Link>
          </p>
        </div>

        {/* Copyright footer */}
        <p className="text-center text-gray-700 text-[10px] mt-6">
          &copy; {new Date().getFullYear()} TeslaPrime. All rights reserved.
        </p>
      </div>
</div>
  );
}
