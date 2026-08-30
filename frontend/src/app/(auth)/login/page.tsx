'use client'

import { useState, FormEvent } from 'react'
import { Eye, EyeOff, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import Cookies from 'js-cookie'

export default function LoginPage() {
  const router = useRouter()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({})

  const validate = () => {
    const errors: { email?: string; password?: string } = {}
    if (!email.trim()) {
      errors.email = 'Email address is required'
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      errors.email = 'Please enter a valid email address'
    }
    if (!password) {
      errors.password = 'Password is required'
    }
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

      Cookies.set('token', data.token, { expires: 7 })

      if (data.user?.isDemo) {
        Cookies.set('demoMode', 'true', { expires: 7 })
      }

      router.push('/dashboard')
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

      Cookies.set('token', data.token, { expires: 7 })
      Cookies.set('demoMode', 'true', { expires: 7 })
      router.push('/dashboard')
    } catch {
      setError('Something went wrong. Please try again.')
      setIsLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-tesla-dark flex">
      {/* Left brand panel - hidden on mobile */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center border-r border-tesla-gray-800">
        <div className="absolute inset-0 bg-tesla-dark" />
        <div className="relative z-10 flex flex-col items-center justify-center px-16">
          {/* Vertical TESLA text */}
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
            Premium investment platform built for the modern investor.
            Secure, transparent, and designed for growth.
          </p>
        </div>
        {/* Subtle corner accent */}
        <div className="absolute top-0 left-0 w-px h-32 bg-gradient-to-b from-tesla-red/40 to-transparent" />
        <div className="absolute bottom-0 right-0 w-px h-32 bg-gradient-to-t from-tesla-red/40 to-transparent" />
      </div>

      {/* Right form panel */}
      <div className="flex-1 flex items-center justify-center px-6 py-12 sm:px-12 lg:px-20">
        <div className="w-full max-w-[420px]">
          {/* Mobile logo */}
          <div className="lg:hidden mb-10">
            <h1 className="text-2xl font-extralight tracking-[0.3em] text-tesla-gray-400 text-center">
              TESLA<span className="text-tesla-red">PRIME</span>CAPITAL
            </h1>
            <div className="mt-2 mx-auto w-8 h-px bg-tesla-red" />
          </div>

          {/* Heading */}
          <h2 className="text-4xl font-bold text-tesla-white tracking-tight">
            Sign In
          </h2>
          <p className="mt-2 text-tesla-gray-300 text-sm">
            Welcome back to TeslaPrimeCapital
          </p>

          {/* Global error */}
          {error && (
            <div className="mt-6 px-4 py-3 border border-tesla-red/40 bg-tesla-red/5">
              <p className="text-tesla-red text-sm">{error}</p>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-8 space-y-5">
            {/* Email */}
            <div>
              <label
                htmlFor="email"
                className="block text-xs font-medium text-tesla-gray-400 uppercase tracking-wider mb-2"
              >
                Email Address
              </label>
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (fieldErrors.email) setFieldErrors((prev) => ({ ...prev, email: undefined }))
                }}
                placeholder="Email address"
                autoComplete="email"
                className={`w-full h-12 px-4 bg-tesla-gray-900 text-tesla-white placeholder-tesla-gray-500 border rounded-none outline-none transition-colors duration-200 text-sm ${
                  fieldErrors.email
                    ? 'border-tesla-red'
                    : 'border-tesla-gray-700 focus:border-tesla-red'
                }`}
              />
              {fieldErrors.email && (
                <p className="mt-1.5 text-xs text-tesla-red">{fieldErrors.email}</p>
              )}
            </div>

            {/* Password */}
            <div>
              <label
                htmlFor="password"
                className="block text-xs font-medium text-tesla-gray-400 uppercase tracking-wider mb-2"
              >
                Password
              </label>
              <div className="relative">
                <input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => {
                    setPassword(e.target.value)
                    if (fieldErrors.password) setFieldErrors((prev) => ({ ...prev, password: undefined }))
                  }}
                  placeholder="Password"
                  autoComplete="current-password"
                  className={`w-full h-12 px-4 pr-12 bg-tesla-gray-900 text-tesla-white placeholder-tesla-gray-500 border rounded-none outline-none transition-colors duration-200 text-sm ${
                    fieldErrors.password
                      ? 'border-tesla-red'
                      : 'border-tesla-gray-700 focus:border-tesla-red'
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
              {fieldErrors.password && (
                <p className="mt-1.5 text-xs text-tesla-red">{fieldErrors.password}</p>
              )}
            </div>

            {/* Submit */}
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

          {/* Sign up link */}
          <p className="mt-6 text-sm text-tesla-gray-400 text-center">
            Don&apos;t have an account?{' '}
            <Link
              href="/register"
              className="text-tesla-red hover:text-red-400 transition-colors font-medium"
            >
              Sign Up
            </Link>
          </p>

          {/* Divider */}
          <div className="mt-8 flex items-center gap-4">
            <div className="flex-1 h-px bg-tesla-gray-800" />
            <span className="text-xs text-tesla-gray-500 uppercase tracking-wider">or continue with</span>
            <div className="flex-1 h-px bg-tesla-gray-800" />
          </div>

          {/* Demo mode */}
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

          {/* Footer */}
          <p className="mt-12 text-center text-xs text-tesla-gray-600">
            &copy; {new Date().getFullYear()} TeslaPrimeCapital. All rights reserved.
          </p>
        </div>
      </div>
    </main>
  )
}