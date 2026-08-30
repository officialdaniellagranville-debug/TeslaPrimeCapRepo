'use client'

import { useState, FormEvent } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'

type Page = 'login' | 'register'

function getPasswordStrength(password: string): { score: number; label: string; color: string } {
  let score = 0
  if (password.length >= 8) score++
  if (password.length >= 12) score++
  if (/[A-Z]/.test(password)) score++
  if (/[a-z]/.test(password)) score++
  if (/[0-9]/.test(password)) score++
  if (/[^A-Za-z0-9]/.test(password)) score++

  if (score <= 2) return { score: 1, label: 'Weak', color: 'bg-tesla-red' }
  if (score <= 3) return { score: 2, label: 'Fair', color: 'bg-orange-500' }
  if (score <= 4) return { score: 3, label: 'Good', color: 'bg-yellow-500' }
  return { score: 4, label: 'Strong', color: 'bg-green-500' }
}

export default function AuthPage() {
  const [page, setPage] = useState<Page>('login')

  return (
    <main className="min-h-screen bg-tesla-dark flex">
      {/* Left brand panel - hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center border-r border-tesla-gray-800">
        <div className="absolute inset-0 bg-tesla-dark" />
        <div className="relative z-10 flex flex-col items-center justify-center px-16">
          <div className="flex flex-col items-center tracking-[0.4em]">
            {'TESLA'.split('').map((letter, i) => (
              <span
                key={i}
                className="text-7xl font-extralight text-tesla-gray-600 leading-[1.1]"
                style={{ opacity: 0.3 + i * 0.15 }}
              >
                {letter}
              </span>
            ))}
          </div>
          <div className="mt-10 text-center">
            <p className="text-tesla-gray-500 text-sm tracking-[0.3em] uppercase">
              Prime Capital
            </p>
            <div className="mt-4 w-12 h-px bg-tesla-red" />
          </div>
          <p className="mt-8 text-tesla-gray-500 text-xs tracking-wider max-w-xs text-center leading-relaxed">
            {page === 'login'
              ? 'Premium investment platform built for the modern investor. Secure, transparent, and designed for growth.'
              : 'Join thousands of investors earning daily returns on our premium managed investment platform.'}
          </p>
        </div>
        <div className="absolute top-0 left-0 w-px h-32 bg-gradient-to-b from-tesla-red/40 to-transparent" />
        <div className="absolute bottom-0 right-0 w-px h-32 bg-gradient-to-t from-tesla-red/40 to-transparent" />
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 sm:px-12 lg:px-20">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="lg:hidden mb-8">
            <h1 className="text-2xl font-extralight tracking-[0.3em] text-tesla-gray-400 text-center">
              TESLA<span className="text-tesla-red">PRIME</span>CAPITAL
            </h1>
            <div className="mt-2 mx-auto w-8 h-px bg-tesla-red" />
          </div>

          {page === 'login' ? <LoginForm onSwitch={() => setPage('register')} /> : <RegisterForm onSwitch={() => setPage('login')} />}
        </div>
      </div>
    </main>
  )
}

/* ─── Login Form ─────────────────────────────────────────────────── */

function LoginForm({ onSwitch }: { onSwitch: () => void }) {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})

  const validate = () => {
    const errors: { email?: string; password?: string } = {}
    if (!email.trim()) errors.email = 'Email address is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Please enter a valid email address'
    if (!password) errors.password = 'Password is required'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!validate()) return
    setIsLoading(true)

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), password }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Invalid email or password')
        setIsLoading(false)
        return
      }
      document.cookie = `token=${data.token}; path=/; max-age=${7 * 24 * 60 * 60}`
      if (data.user?.isDemo) {
        document.cookie = 'demoMode=true; path=/; max-age=${7 * 24 * 60 * 60}'
      }
      window.location.href = '/dashboard'
    } catch {
      setError('Something went wrong. Please try again.')
      setIsLoading(false)
    }
  }

  const handleDemoLogin = async () => {
    setIsLoading(true)
    setError('')
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: 'demo@teslaprimecapital.com', password: 'Demo@2024' }),
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data.error || 'Demo account is currently unavailable')
        setIsLoading(false)
        return
      }
      document.cookie = `token=${data.token}; path=/; max-age=${7 * 24 * 60 * 60}`
      document.cookie = 'demoMode=true; path=/; max-age=${7 * 24 * 60 * 60}'
      window.location.href = '/dashboard'
    } catch {
      setError('Something went wrong. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <>
      <h2 className="text-4xl font-bold text-tesla-white tracking-tight">Sign In</h2>
      <p className="mt-2 text-tesla-gray-300 text-sm">Welcome back to TeslaPrimeCapital</p>

      {error && (
        <div className="mt-6 px-4 py-3 border border-tesla-red/40 bg-tesla-red/5">
          <p className="text-tesla-red text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <div>
          <label htmlFor="email" className="block text-xs font-medium text-tesla-gray-400 uppercase tracking-wider mb-2">
            Email Address
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value)
              if (fieldErrors.email) setFieldErrors((p) => ({ ...p, email: undefined }))
            }}
            placeholder="Email address"
            autoComplete="email"
            className={`w-full h-12 px-4 bg-tesla-gray-900 text-tesla-white placeholder-tesla-gray-500 border rounded-none outline-none transition-colors duration-200 text-sm ${
              fieldErrors.email ? 'border-tesla-red' : 'border-tesla-gray-700 focus:border-tesla-red'
            }`}
          />
          {fieldErrors.email && <p className="mt-1.5 text-xs text-tesla-red">{fieldErrors.email}</p>}
        </div>

        <div>
          <label htmlFor="password" className="block text-xs font-medium text-tesla-gray-400 uppercase tracking-wider mb-2">
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                if (fieldErrors.password) setFieldErrors((p) => ({ ...p, password: undefined }))
              }}
              placeholder="Password"
              autoComplete="current-password"
              className={`w-full h-12 px-4 pr-12 bg-tesla-gray-900 text-tesla-white placeholder-tesla-gray-500 border rounded-none outline-none transition-colors duration-200 text-sm ${
                fieldErrors.password ? 'border-tesla-red' : 'border-tesla-gray-700 focus:border-tesla-red'
              }`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-tesla-gray-500 hover:text-tesla-gray-300 transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {fieldErrors.password && <p className="mt-1.5 text-xs text-tesla-red">{fieldErrors.password}</p>}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-12 bg-tesla-red text-tesla-white font-medium text-sm tracking-wide hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-200 rounded-none flex items-center justify-center gap-2 mt-8"
        >
          {isLoading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Signing In...
            </>
          ) : (
            'Sign In'
          )}
        </button>
      </form>

      <p className="mt-6 text-sm text-tesla-gray-400 text-center">
        Don&apos;t have an account?{' '}
        <button onClick={onSwitch} className="text-tesla-red hover:text-red-400 transition-colors font-medium">
          Sign Up
        </button>
      </p>

      <div className="mt-8 flex items-center gap-4">
        <div className="flex-1 h-px bg-tesla-gray-800" />
        <span className="text-xs text-tesla-gray-500 uppercase tracking-wider">or continue with</span>
        <div className="flex-1 h-px bg-tesla-gray-800" />
      </div>

      <button
        onClick={handleDemoLogin}
        disabled={isLoading}
        className="mt-6 w-full h-12 border border-tesla-gray-700 text-tesla-gray-300 font-medium text-sm tracking-wide hover:border-tesla-gray-500 hover:text-tesla-white disabled:opacity-60 disabled:cursor-not-allowed transition-all duration-200 rounded-none flex items-center justify-center gap-2"
      >
        {isLoading ? (
          <Loader2 size={18} className="animate-spin" />
        ) : (
          <>
            <div className="w-2 h-2 rounded-full bg-tesla-red" />
            Try Demo Account
          </>
        )}
      </button>

      <p className="mt-12 text-center text-xs text-tesla-gray-600">
        &copy; {new Date().getFullYear()} TeslaPrimeCapital. All rights reserved.
      </p>
    </>
  )
}

/* ─── Register Form ──────────────────────────────────────────────── */

interface RegFieldErrors {
  firstName?: string
  lastName?: string
  email?: string
  password?: string
  confirmPassword?: string
  referralCode?: string
  terms?: string
}

function RegisterForm({ onSwitch }: { onSwitch: () => void }) {
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [referralCode, setReferralCode] = useState('')
  const [agreedToTerms, setAgreedToTerms] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<RegFieldErrors>({})

  const passwordStrength = getPasswordStrength(password)

  const validate = () => {
    const errors: RegFieldErrors = {}
    if (!firstName.trim()) errors.firstName = 'First name is required'
    if (!lastName.trim()) errors.lastName = 'Last name is required'
    if (!email.trim()) errors.email = 'Email address is required'
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) errors.email = 'Please enter a valid email address'
    if (!password) errors.password = 'Password is required'
    else if (password.length < 8) errors.password = 'Password must be at least 8 characters'
    if (!confirmPassword) errors.confirmPassword = 'Please confirm your password'
    else if (password !== confirmPassword) errors.confirmPassword = 'Passwords do not match'
    if (referralCode.trim() && referralCode.trim().length !== 8) errors.referralCode = 'Referral code must be 8 characters'
    if (!agreedToTerms) errors.terms = 'You must agree to the terms to continue'
    setFieldErrors(errors)
    return Object.keys(errors).length === 0
  }

  const clearFieldError = (field: keyof RegFieldErrors) => {
    if (fieldErrors[field]) setFieldErrors((p) => ({ ...p, [field]: undefined }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError('')
    if (!validate()) return
    setIsLoading(true)

    try {
      const body: Record<string, string> = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase(),
        password,
        confirmPassword,
      }
      if (referralCode.trim()) body.referralCode = referralCode.trim().toUpperCase()

      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (!res.ok) {
        setError(data.error || 'Registration failed. Please try again.')
        setIsLoading(false)
        return
      }

      setSuccess(true)
      setIsLoading(false)
      setTimeout(() => onSwitch(), 2000)
    } catch {
      setError('Something went wrong. Please try again.')
      setIsLoading(false)
    }
  }

  const inputClass = (field: keyof RegFieldErrors) =>
    `w-full h-12 px-4 bg-tesla-gray-900 text-tesla-white placeholder-tesla-gray-500 border rounded-none outline-none transition-colors duration-200 text-sm ${
      fieldErrors[field] ? 'border-tesla-red' : 'border-tesla-gray-700 focus:border-tesla-red'
    }`

  return (
    <>
      <h2 className="text-4xl font-bold text-tesla-white tracking-tight">Create Account</h2>
      <p className="mt-2 text-tesla-gray-300 text-sm">Start your investment journey with TeslaPrimeCapital</p>

      {success && (
        <div className="mt-6 px-4 py-3 border border-green-500/40 bg-green-500/5">
          <p className="text-green-400 text-sm">Account created successfully. Redirecting to sign in...</p>
        </div>
      )}

      {error && (
        <div className="mt-6 px-4 py-3 border border-tesla-red/40 bg-tesla-red/5">
          <p className="text-tesla-red text-sm">{error}</p>
        </div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        {/* Name row */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="firstName" className="block text-xs font-medium text-tesla-gray-400 uppercase tracking-wider mb-2">
              First Name
            </label>
            <input
              id="firstName"
              type="text"
              value={firstName}
              onChange={(e) => { setFirstName(e.target.value); clearFieldError('firstName') }}
              placeholder="First name"
              autoComplete="given-name"
              className={inputClass('firstName')}
            />
            {fieldErrors.firstName && <p className="mt-1.5 text-xs text-tesla-red">{fieldErrors.firstName}</p>}
          </div>
          <div>
            <label htmlFor="lastName" className="block text-xs font-medium text-tesla-gray-400 uppercase tracking-wider mb-2">
              Last Name
            </label>
            <input
              id="lastName"
              type="text"
              value={lastName}
              onChange={(e) => { setLastName(e.target.value); clearFieldError('lastName') }}
              placeholder="Last name"
              autoComplete="family-name"
              className={inputClass('lastName')}
            />
            {fieldErrors.lastName && <p className="mt-1.5 text-xs text-tesla-red">{fieldErrors.lastName}</p>}
          </div>
        </div>

        {/* Email */}
        <div>
          <label htmlFor="reg-email" className="block text-xs font-medium text-tesla-gray-400 uppercase tracking-wider mb-2">
            Email Address
          </label>
          <input
            id="reg-email"
            type="email"
            value={email}
            onChange={(e) => { setEmail(e.target.value); clearFieldError('email') }}
            placeholder="Email address"
            autoComplete="email"
            className={inputClass('email')}
          />
          {fieldErrors.email && <p className="mt-1.5 text-xs text-tesla-red">{fieldErrors.email}</p>}
        </div>

        {/* Password */}
        <div>
          <label htmlFor="reg-password" className="block text-xs font-medium text-tesla-gray-400 uppercase tracking-wider mb-2">
            Password
          </label>
          <div className="relative">
            <input
              id="reg-password"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => { setPassword(e.target.value); clearFieldError('password') }}
              placeholder="Create a password"
              autoComplete="new-password"
              className={`pr-12 ${inputClass('password')}`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-tesla-gray-500 hover:text-tesla-gray-300 transition-colors"
              aria-label={showPassword ? 'Hide password' : 'Show password'}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {fieldErrors.password && <p className="mt-1.5 text-xs text-tesla-red">{fieldErrors.password}</p>}
          {password.length > 0 && (
            <div className="mt-2">
              <div className="flex gap-1">
                {[1, 2, 3, 4].map((level) => (
                  <div
                    key={level}
                    className={`h-1 flex-1 transition-colors duration-300 ${
                      level <= passwordStrength.score ? passwordStrength.color : 'bg-tesla-gray-700'
                    }`}
                  />
                ))}
              </div>
              <p
                className={`mt-1 text-xs ${
                  passwordStrength.score <= 1
                    ? 'text-tesla-red'
                    : passwordStrength.score === 2
                      ? 'text-orange-400'
                      : passwordStrength.score === 3
                        ? 'text-yellow-400'
                        : 'text-green-400'
                }`}
              >
                {passwordStrength.label}
              </p>
            </div>
          )}
        </div>

        {/* Confirm Password */}
        <div>
          <label htmlFor="confirmPassword" className="block text-xs font-medium text-tesla-gray-400 uppercase tracking-wider mb-2">
            Confirm Password
          </label>
          <div className="relative">
            <input
              id="confirmPassword"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => { setConfirmPassword(e.target.value); clearFieldError('confirmPassword') }}
              placeholder="Confirm your password"
              autoComplete="new-password"
              className={`pr-12 ${inputClass('confirmPassword')}`}
            />
            <button
              type="button"
              onClick={() => setShowConfirmPassword(!showConfirmPassword)}
              className="absolute right-4 top-1/2 -translate-y-1/2 text-tesla-gray-500 hover:text-tesla-gray-300 transition-colors"
              aria-label={showConfirmPassword ? 'Hide password' : 'Show password'}
            >
              {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
          {fieldErrors.confirmPassword && <p className="mt-1.5 text-xs text-tesla-red">{fieldErrors.confirmPassword}</p>}
        </div>

        {/* Referral Code */}
        <div>
          <label htmlFor="referralCode" className="block text-xs font-medium text-tesla-gray-400 uppercase tracking-wider mb-2">
            Referral Code <span className="normal-case tracking-normal text-tesla-gray-600">(optional)</span>
          </label>
          <input
            id="referralCode"
            type="text"
            value={referralCode}
            onChange={(e) => { setReferralCode(e.target.value.toUpperCase()); clearFieldError('referralCode') }}
            placeholder="Enter referral code"
            maxLength={8}
            className={`uppercase ${inputClass('referralCode')}`}
          />
          {fieldErrors.referralCode && <p className="mt-1.5 text-xs text-tesla-red">{fieldErrors.referralCode}</p>}
        </div>

        {/* Terms */}
        <div>
          <div className="flex items-start gap-3">
            <button
              type="button"
              onClick={() => { setAgreedToTerms(!agreedToTerms); clearFieldError('terms') }}
              className="mt-0.5 w-5 h-5 shrink-0 flex items-center justify-center transition-colors"
              aria-label="Agree to terms"
            >
              <div
                className={`w-full h-full flex items-center justify-center ${
                  agreedToTerms
                    ? 'bg-tesla-red border border-tesla-red'
                    : 'border border-tesla-gray-600 bg-tesla-gray-900'
                }`}
              >
                {agreedToTerms && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </button>
            <span className="text-xs text-tesla-gray-400 leading-relaxed">
              I agree to the{' '}
              <span className="text-tesla-gray-300 hover:text-tesla-white transition-colors cursor-pointer">Terms of Service</span>
              {' '}and{' '}
              <span className="text-tesla-gray-300 hover:text-tesla-white transition-colors cursor-pointer">Privacy Policy</span>
            </span>
          </div>
          {fieldErrors.terms && <p className="mt-1.5 text-xs text-tesla-red ml-8">{fieldErrors.terms}</p>}
        </div>

        {/* Submit */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full h-12 bg-tesla-red text-tesla-white font-medium text-sm tracking-wide hover:bg-red-700 disabled:opacity-60 disabled:cursor-not-allowed transition-colors duration-200 rounded-none flex items-center justify-center gap-2 mt-6"
        >
          {isLoading ? (
            <>
              <Loader2 size={18} className="animate-spin" />
              Creating Account...
            </>
          ) : (
            'Create Account'
          )}
        </button>
      </form>

      <p className="mt-6 text-sm text-tesla-gray-400 text-center">
        Already have an account?{' '}
        <button onClick={onSwitch} className="text-tesla-red hover:text-red-400 transition-colors font-medium">
          Sign In
        </button>
      </p>

      <p className="mt-12 text-center text-xs text-tesla-gray-600">
        &copy; {new Date().getFullYear()} TeslaPrimeCapital. All rights reserved.
      </p>
    </>
  )
}