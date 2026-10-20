'use client';

import { useState, useRef } from 'react';
import Link from 'next/link';
import TeslaLogo from '@/components/TeslaLogo';
import TurnstileWidget from '@/components/TurnstileWidget';

function getPasswordStrength(pw: string): { level: number; label: string; color: string } {
  let score = 0;
  if (pw.length >= 6) score++;
  if (pw.length >= 10) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw) && /[^A-Za-z0-9]/.test(pw)) score++;
  const levels = [
    { level: 0, label: 'Too Short', color: 'bg-gray-600' },
    { level: 1, label: 'Weak', color: 'bg-red-500' },
    { level: 2, label: 'Fair', color: 'bg-orange-500' },
    { level: 3, label: 'Good', color: 'bg-yellow-500' },
    { level: 4, label: 'Strong', color: 'bg-green-500' },
  ];
  return levels[score] || levels[0];
}

export default function RegisterPage() {
  const [step, setStep] = useState<'form' | 'verify' | 'success'>('form');
  const [form, setForm] = useState({ firstName: '', lastName: '', email: '', password: '', confirmPassword: '', referralCode: '', terms: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  // OTP verification state
  const [otpCode, setOtpCode] = useState(['', '', '', '', '', '']);
  const [verifyLoading, setVerifyLoading] = useState(false);
  const [verifyError, setVerifyError] = useState('');
  const [verifySuccess, setVerifySuccess] = useState(false);
  const [resendLoading, setResendLoading] = useState(false);
  const [resendTimer, setResendTimer] = useState(60);
  const [resendInterval, setResendInterval] = useState<NodeJS.Timeout | null>(null);
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [captchaToken, setCaptchaToken] = useState<string | null>(null);

  const strength = getPasswordStrength(form.password);

  const update = (field: string, value: string | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => { const n = { ...prev }; delete n[field]; return n; });
  };

  const validate = () => {
    const errs: Record<string, string> = {};
    if (!form.firstName.trim()) errs.firstName = 'First name is required';
    else if (form.firstName.trim().length < 2) errs.firstName = 'First name must be at least 2 characters';
    else if (!/^[a-zA-Z\s'-]+$/.test(form.firstName.trim())) errs.firstName = 'First name can only contain letters, spaces, hyphens, and apostrophes';
    if (!form.lastName.trim()) errs.lastName = 'Last name is required';
    else if (form.lastName.trim().length < 2) errs.lastName = 'Last name must be at least 2 characters';
    else if (!/^[a-zA-Z\s'-]+$/.test(form.lastName.trim())) errs.lastName = 'Last name can only contain letters, spaces, hyphens, and apostrophes';
    if (!form.email.trim()) errs.email = 'Email is required';
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) errs.email = 'Please enter a valid email address (e.g. you@example.com)';
    if (!form.password) errs.password = 'Password is required';
    else if (form.password.length < 8) errs.password = 'Password must be at least 8 characters';
    else if (!/[A-Z]/.test(form.password)) errs.password = 'Password must contain at least one uppercase letter';
    else if (!/[a-z]/.test(form.password)) errs.password = 'Password must contain at least one lowercase letter';
    else if (!/[0-9]/.test(form.password)) errs.password = 'Password must contain at least one number';
    if (!form.confirmPassword) errs.confirmPassword = 'Please confirm your password';
    else if (form.password !== form.confirmPassword) errs.confirmPassword = 'Passwords do not match';
    if (form.referralCode && form.referralCode.trim().length < 3) errs.referralCode = 'Referral code must be at least 3 characters';
    if (!form.terms) errs.terms = 'You must accept the terms and conditions';
    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

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

  const handleRegister = async () => {
    setError('');
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: form.firstName.trim(),
          lastName: form.lastName.trim(),
          email: form.email.trim(),
          password: form.password,
          referralCode: form.referralCode.trim() || undefined,
          captchaToken: captchaToken || undefined,
        }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.data?.emailSent === false) {
          setVerifyError(data.data?.emailError || 'Verification email could not be sent. Use "Resend Code" below.');
          // Bootstrap mode: auto-fill OTP when email fails so users can still verify
          if (data.data?.otp) {
            const otp = String(data.data.otp);
            const newCode = [...otpCode];
            otp.split('').forEach((char: string, i: number) => { if (i < 6) newCode[i] = char; });
            setOtpCode(newCode);
          }
        }
        setStep('verify');
        startResendTimer();
      } else {
        const msg = data.error?.message || data.error || 'Registration failed. Please try again.';
        if (data.error?.code === 'EMAIL_EXISTS') {
          setError('This email is already registered. Please sign in instead.');
        } else if (data.error?.code === 'INVALID_REFERRAL_CODE') {
          setError('The referral code you entered is invalid. Please check and try again.');
        } else {
          setError(msg);
        }
      }
    } catch {
      setError('Network error. Please check your connection and try again.');
    } finally {
      setLoading(false);
    }
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
    if (e.key === 'Enter') handleVerifyOtp();
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

  const handleVerifyOtp = async () => {
    const otp = otpCode.join('');
    if (otp.length !== 6) {
      setVerifyError('Please enter the complete 6-digit code');
      return;
    }
    setVerifyLoading(true);
    setVerifyError('');
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email.trim(), code: otp, action: 'verify', name: form.firstName.trim() }),
      });
      const data = await res.json();
      if (res.ok && data.data?.verified) {
        setVerifySuccess(true);
        if (resendInterval) clearInterval(resendInterval);
        setTimeout(() => setStep('success'), 2000);
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
    if (resendTimer > 0) return;
    setResendLoading(true);
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email.trim(), action: 'resend', name: form.firstName.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setOtpCode(['', '', '', '', '', '']);
        setVerifyError('');
        startResendTimer();
      } else {
        setVerifyError(data.error?.message || 'Failed to resend code. Please try again.');
      }
    } catch {
      setVerifyError('Network error. Please try again.');
    } finally {
      setResendLoading(false);
    }
  };

  const inputCls = (field?: string) =>
    `w-full bg-[#1a1a1a] border ${field && errors[field] ? 'border-red-500' : 'border-tesla-border'} rounded-lg px-4 py-3 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-[#CC0000] transition-colors`;

  // ── SUCCESS SCREEN ──
  if (step === 'success') {
    return (
      <div className="min-h-screen bg-tesla-dark flex flex-col items-center justify-center px-4 py-12">
        <div className="w-full max-w-md text-center">
          <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-green-900/30 border border-green-700/50 flex items-center justify-center">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="#22C55E" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
          </div>
          <TeslaLogo className="h-8 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white mb-2">Account Verified!</h1>
          <p className="text-gray-400 text-sm mb-8">Your email has been verified and your account is now active. You can sign in and start investing.</p>
          <Link href="/login" className="inline-block w-full bg-[#CC0000] hover:bg-[#a30000] text-white font-semibold py-3 rounded-lg transition-colors text-sm">
            Sign In Now
          </Link>
        </div>
</div>
    );
  }

  // ── OTP VERIFICATION SCREEN ──
  if (step === 'verify') {
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
            <p className="text-gray-400 text-sm">
              We sent a 6-digit code to <span className="text-white font-medium">{form.email}</span>
            </p>
          </div>

          <div className="bg-tesla-card border border-tesla-border rounded-2xl p-6 sm:p-8">
            {verifyError && (
              <div className="bg-red-900/30 border border-red-800/50 text-red-400 text-sm rounded-lg px-4 py-3 mb-5">{verifyError}</div>
            )}

            {verifySuccess && (
              <div className="bg-green-900/30 border border-green-800/50 text-green-400 text-sm rounded-lg px-4 py-3 mb-5">
                <div className="flex items-center justify-center gap-2">
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12" /></svg>
                  <span>Email verified successfully! Redirecting...</span>
                </div>
              </div>
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
                  disabled={verifyLoading || verifySuccess}
                  className={`w-12 h-14 bg-[#1a1a1a] border ${verifyError ? 'border-red-500' : 'border-tesla-border'} rounded-lg text-center text-xl font-bold text-white focus:outline-none focus:border-[#CC0000] transition-colors disabled:opacity-50`}
                />
              ))}
            </div>

            <button
              onClick={handleVerifyOtp}
              disabled={verifyLoading || otpCode.join('').length < 6 || verifySuccess}
              className="w-full bg-[#CC0000] hover:bg-[#a30000] disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors text-sm"
            >
              {verifyLoading ? (
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
                onClick={handleResendOtp}
                disabled={resendTimer > 0 || resendLoading || verifySuccess}
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

            {/* Back to form */}
            <button
              onClick={() => {
                setStep('form');
                setOtpCode(['', '', '', '', '', '']);
                setVerifyError('');
                setVerifySuccess(false);
                if (resendInterval) clearInterval(resendInterval);
              }}
              className="w-full text-gray-500 hover:text-gray-300 text-sm mt-4"
            >
              Back to registration
            </button>
          </div>

          <p className="text-center text-gray-700 text-[10px] mt-4">
            &copy; {new Date().getFullYear()} TeslaPrime. All rights reserved.
          </p>
        </div>
</div>
    );
  }

  // ── REGISTRATION FORM ──
  return (
    <div className="min-h-screen bg-tesla-dark flex flex-col items-center justify-center px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <TeslaLogo className="h-14 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-white">Create Account</h1>
          <p className="text-gray-400 text-sm mt-1">Start your investment journey today</p>
        </div>

        <div className="bg-tesla-card border border-tesla-border rounded-2xl p-6 sm:p-8">
          {error && (
            <div className="bg-red-900/30 border border-red-800/50 text-red-400 text-sm rounded-lg px-4 py-3 mb-5">{error}</div>
          )}

          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1.5">First Name *</label>
                <input type="text" value={form.firstName} onChange={(e) => update('firstName', e.target.value)} placeholder="John" className={inputCls('firstName')} />
                {errors.firstName && <p className="text-red-400 text-xs mt-1">{errors.firstName}</p>}
              </div>
              <div>
                <label className="block text-gray-300 text-sm font-medium mb-1.5">Last Name *</label>
                <input type="text" value={form.lastName} onChange={(e) => update('lastName', e.target.value)} placeholder="Doe" className={inputCls('lastName')} />
                {errors.lastName && <p className="text-red-400 text-xs mt-1">{errors.lastName}</p>}
              </div>
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-1.5">Email Address *</label>
              <input type="email" value={form.email} onChange={(e) => update('email', e.target.value)} placeholder="you@example.com" className={inputCls('email')} />
              {errors.email && <p className="text-red-400 text-xs mt-1">{errors.email}</p>}
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-1.5">Password *</label>
              <input type="password" value={form.password} onChange={(e) => update('password', e.target.value)} placeholder="Min 8 chars, uppercase, lowercase, number" className={inputCls('password')} />
              {errors.password && <p className="text-red-400 text-xs mt-1">{errors.password}</p>}
              {form.password && (
                <div className="mt-2">
                  <div className="flex gap-1.5">
                    {[1, 2, 3, 4].map((i) => (
                      <div key={i} className={`h-1.5 flex-1 rounded-full ${i <= strength.level ? strength.color : 'bg-gray-700'} transition-colors`} />
                    ))}
                  </div>
                  <p className="text-xs mt-1 text-gray-500">{strength.label}</p>
                </div>
              )}
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-1.5">Confirm Password *</label>
              <input type="password" value={form.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)} placeholder="Repeat password" className={inputCls('confirmPassword')} />
              {errors.confirmPassword && <p className="text-red-400 text-xs mt-1">{errors.confirmPassword}</p>}
            </div>
            <div>
              <label className="block text-gray-300 text-sm font-medium mb-1.5">Referral Code <span className="text-gray-600">(optional)</span></label>
              <input type="text" value={form.referralCode} onChange={(e) => update('referralCode', e.target.value)} placeholder="Enter referral code" className={inputCls('referralCode')} />
              {errors.referralCode && <p className="text-red-400 text-xs mt-1">{errors.referralCode}</p>}
            </div>
            <div className="flex items-start gap-2 pt-1">
              <input
                type="checkbox"
                checked={form.terms}
                onChange={(e) => update('terms', e.target.checked)}
                className="mt-0.5 accent-[#CC0000]"
              />
              <span className="text-gray-400 text-xs leading-relaxed">
                I agree to the <Link href="/terms" className="text-[#CC0000] hover:underline">Terms of Service</Link> and <Link href="/privacy" className="text-[#CC0000] hover:underline">Privacy Policy</Link>
              </span>
            </div>
            {errors.terms && <p className="text-red-400 text-xs">{errors.terms}</p>}
          </div>

          {/* Cloudflare Turnstile CAPTCHA */}
          <TurnstileWidget
            onToken={(token) => setCaptchaToken(token)}
            onError={() => setCaptchaToken(null)}
            onExpire={() => setCaptchaToken(null)}
          />

          <button
            onClick={handleRegister}
            disabled={loading}
            className="w-full mt-6 bg-[#CC0000] hover:bg-[#a30000] disabled:opacity-50 text-white font-semibold py-3 rounded-lg transition-colors text-sm"
          >
            {loading ? (
              <span className="flex items-center justify-center gap-2">
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                Creating Account...
              </span>
            ) : 'Create Account'}
          </button>

          <p className="text-center text-gray-500 text-sm mt-6">
            Already have an account?{' '}
            <Link href="/login" className="text-[#CC0000] hover:underline font-medium">Sign In</Link>
          </p>
        </div>
      </div>
</div>
  );
}
