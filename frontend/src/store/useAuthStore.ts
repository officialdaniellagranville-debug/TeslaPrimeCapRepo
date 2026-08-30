import { create } from 'zustand'
import Cookies from 'js-cookie'

interface User {
  id: string
  email: string
  role: string
  isDemo: boolean
  referralCode: string
  profile?: {
    firstName: string
    lastName: string
    kycLevel: string
  }
  wallets?: { id: string; balance: number; isDemo: boolean }[]
}

interface AuthState {
  user: User | null
  token: string | null
  isDemo: boolean
  setAuth: (user: User, token: string) => void
  logout: () => void
  setDemoMode: (isDemo: boolean) => void
  isAdmin: () => boolean
  isSuperAdmin: () => boolean
  getActiveWallet: () => { id: string; balance: number } | null
}

export const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  token: typeof window !== 'undefined' ? Cookies.get('token') || null : null,
  isDemo: false,

  setAuth: (user, token) => {
    Cookies.set('token', token, { expires: 7 })
    set({ user, token })
  },

  logout: () => {
    Cookies.remove('token')
    set({ user: null, token: null, isDemo: false })
    window.location.href = '/login'
  },

  setDemoMode: (isDemo) => set({ isDemo }),

  isAdmin: () => {
    const { user } = get()
    return user?.role === 'ADMIN' || user?.role === 'SUPER_ADMIN'
  },

  isSuperAdmin: () => {
    const { user } = get()
    return user?.role === 'SUPER_ADMIN'
  },

  getActiveWallet: () => {
    const { user, isDemo } = get()
    if (!user?.wallets) return null
    const wallet = user.wallets.find(w => w.isDemo === isDemo)
    return wallet || user.wallets[0] || null
  }
}))