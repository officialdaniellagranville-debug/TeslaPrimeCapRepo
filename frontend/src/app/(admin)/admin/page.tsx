'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  Users, DollarSign, TrendingUp, Shield, Clock, CheckCircle, XCircle,
  ChevronDown, Search, Eye, ArrowLeftRight, Bell, LogOut, LayoutDashboard
} from 'lucide-react'

interface AdminStats {
  totalUsers: number
  totalDeposits: number
  totalWithdrawals: number
  activeInvestments: number
  pendingKYC: number
  pendingDeposits: number
  pendingWithdrawals: number
}

interface AdminUser {
  id: string
  email: string
  role: string
  isActive: boolean
  isDemo: boolean
  createdAt: string
  profile?: { firstName: string; lastName: string; kycLevel: string }
}

interface PendingItem {
  id: string
  userId: string
  amount?: number
  method?: string
  walletAddr?: string
  status: string
  createdAt: string
  user?: { email: string; profile?: { firstName: string; lastName: string } }
  docType?: string
}

const SIDEBAR_ITEMS = [
  { label: 'Dashboard', icon: LayoutDashboard, href: '/admin' },
  { label: 'User Management', icon: Users, href: '/admin#users' },
  { label: 'Pending Deposits', icon: DollarSign, href: '/admin#deposits' },
  { label: 'Pending Withdrawals', icon: ArrowLeftRight, href: '/admin#withdrawals' },
  { label: 'KYC Review', icon: Shield, href: '/admin#kyc' },
]

export default function AdminPage() {
  const [activeTab, setActiveTab] = useState('dashboard')
  const [stats, setStats] = useState<AdminStats | null>(null)
  const [users, setUsers] = useState<AdminUser[]>([])
  const [deposits, setDeposits] = useState<PendingItem[]>([])
  const [withdrawals, setWithdrawals] = useState<PendingItem[]>([])
  const [kycItems, setKycItems] = useState<PendingItem[]>([])
  const [loading, setLoading] = useState(true)
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    loadDashboard()
  }, [])

  const loadDashboard = async () => {
    try {
      const [statsRes, usersRes, depositsRes, withdrawalsRes, kycRes] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/users'),
        fetch('/api/admin/deposits'),
        fetch('/api/admin/withdrawals'),
        fetch('/api/admin/kyc'),
      ])
      const s = await statsRes.json()
      const u = await usersRes.json()
      const d = await depositsRes.json()
      const w = await withdrawalsRes.json()
      const k = await kycRes.json()
      if (s.data) setStats(s.data)
      if (s.totalUsers !== undefined) setStats(s)
      if (Array.isArray(u)) setUsers(u)
      if (u.data) setUsers(u.data.users || u.data)
      if (Array.isArray(d)) setDeposits(d)
      if (d.data) setDeposits(d.data.deposits || d.data)
      if (Array.isArray(w)) setWithdrawals(w)
      if (w.data) setWithdrawals(w.data.withdrawals || w.data)
      if (Array.isArray(k)) setKycItems(k)
      if (k.data) setKycItems(k.data)
    } catch (e) {
      console.error('Failed to load admin data:', e)
      // Use mock data for preview
      setStats({ totalUsers: 1247, totalDeposits: 2450000, totalWithdrawals: 890000, activeInvestments: 534, pendingKYC: 23, pendingDeposits: 15, pendingWithdrawals: 8 })
      setUsers([
        { id: '1', email: 'john@example.com', role: 'USER', isActive: true, isDemo: false, createdAt: '2024-01-15', profile: { firstName: 'John', lastName: 'Doe', kycLevel: 'ADVANCED' } },
        { id: '2', email: 'jane@example.com', role: 'USER', isActive: true, isDemo: false, createdAt: '2024-01-20', profile: { firstName: 'Jane', lastName: 'Smith', kycLevel: 'BASIC' } },
        { id: '3', email: 'bob@example.com', role: 'USER', isActive: false, isDemo: true, createdAt: '2024-02-01', profile: { firstName: 'Bob', lastName: 'Wilson', kycLevel: 'NONE' } },
        { id: '4', email: 'alice@example.com', role: 'USER', isActive: true, isDemo: false, createdAt: '2024-02-10', profile: { firstName: 'Alice', lastName: 'Brown', kycLevel: 'INTERMEDIATE' } },
        { id: '5', email: 'demo@test.com', role: 'USER', isActive: true, isDemo: true, createdAt: '2024-03-01', profile: { firstName: 'Demo', lastName: 'User', kycLevel: 'NONE' } },
      ])
      setDeposits([
        { id: 'd1', userId: '1', amount: 5000, method: 'BTC', walletAddr: 'bc1q...xyz', status: 'PENDING', createdAt: '2024-03-15', user: { email: 'john@example.com', profile: { firstName: 'John', lastName: 'Doe' } } },
        { id: 'd2', userId: '2', amount: 10000, method: 'ETH', walletAddr: '0x...abc', status: 'PENDING', createdAt: '2024-03-16', user: { email: 'jane@example.com', profile: { firstName: 'Jane', lastName: 'Smith' } } },
      ])
      setWithdrawals([
        { id: 'w1', userId: '1', amount: 2500, walletAddr: 'bc1q...xyz', status: 'PENDING', createdAt: '2024-03-14', user: { email: 'john@example.com', profile: { firstName: 'John', lastName: 'Doe' } } },
      ])
      setKycItems([
        { id: 'k1', userId: '2', status: 'PENDING', createdAt: '2024-03-15', docType: 'PASSPORT', user: { email: 'jane@example.com', profile: { firstName: 'Jane', lastName: 'Smith' } } },
        { id: 'k2', userId: '4', status: 'PENDING', createdAt: '2024-03-16', docType: 'DRIVERS_LICENSE', user: { email: 'alice@example.com', profile: { firstName: 'Alice', lastName: 'Brown' } } },
      ])
    } finally {
      setLoading(false)
    }
  }

  const handleAction = async (type: 'deposits' | 'withdrawals' | 'kyc', id: string, action: 'approve' | 'reject') => {
    try {
      const endpoint = `/api/admin/${type}`
      await fetch(endpoint, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, action }),
      })
      loadDashboard()
    } catch (e) {
      console.error('Action failed:', e)
    }
  }

  const formatCurrency = (amount: number) => `$${amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`

  return (
    <div className="min-h-screen bg-tesla-dark flex">
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-50 w-64 bg-tesla-gray-900 border-r border-tesla-gray-700 transform transition-transform duration-300 lg:translate-x-0 ${sidebarOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-tesla-gray-700">
          <h1 className="text-lg font-bold tracking-[0.2em] text-tesla-white">TESLA</h1>
          <p className="text-[10px] tracking-[0.3em] text-tesla-gray-500 uppercase">Admin Panel</p>
        </div>
        <nav className="p-4 space-y-1">
          {SIDEBAR_ITEMS.map((item) => (
            <button
              key={item.label}
              onClick={() => { setActiveTab(item.label.split(' ')[0].toLowerCase()); setSidebarOpen(false) }}
              className={`w-full flex items-center gap-3 px-4 py-3 text-sm transition-all duration-200 border-l-2 ${
                activeTab === item.label.split(' ')[0].toLowerCase()
                  ? 'bg-tesla-gray-800 text-tesla-white border-tesla-red'
                  : 'text-tesla-gray-400 hover:text-tesla-white hover:bg-tesla-gray-800/50 border-transparent'
              }`}
            >
              <item.icon size={18} />
              {item.label}
            </button>
          ))}
          <div className="pt-4 border-t border-tesla-gray-700 mt-4">
            <Link href="/dashboard" className="w-full flex items-center gap-3 px-4 py-3 text-sm text-tesla-gray-400 hover:text-tesla-white transition-colors">
              <ArrowLeftRight size={18} />
              Back to Dashboard
            </Link>
          </div>
        </nav>
      </aside>

      {/* Main Content */}
      <div className="flex-1 lg:ml-64">
        {/* Top bar */}
        <header className="sticky top-0 z-40 h-16 bg-tesla-dark/80 backdrop-blur-xl border-b border-tesla-gray-700 flex items-center justify-between px-6">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-tesla-gray-400 hover:text-white">
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16M4 18h16" /></svg>
          </button>
          <h2 className="text-lg font-semibold text-tesla-white">Administration</h2>
          <div className="flex items-center gap-4">
            <button className="relative text-tesla-gray-400 hover:text-white transition-colors">
              <Bell size={20} />
              {stats && stats.pendingKYC > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-tesla-red text-[10px] text-white flex items-center justify-center rounded-full">
                  {stats.pendingDeposits + stats.pendingWithdrawals + stats.pendingKYC}
                </span>
              )}
            </button>
            <div className="w-8 h-8 bg-tesla-red flex items-center justify-center text-white text-xs font-bold">SA</div>
          </div>
        </header>

        <main className="p-6">
          {loading ? (
            <div className="flex items-center justify-center h-96">
              <div className="w-8 h-8 border-2 border-tesla-gray-700 border-t-tesla-red rounded-full animate-spin" />
            </div>
          ) : (
            <>
              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {stats && [
                  { label: 'Total Users', value: stats.totalUsers.toLocaleString(), icon: Users, accent: false },
                  { label: 'Total Deposits', value: formatCurrency(stats.totalDeposits), icon: DollarSign, accent: true },
                  { label: 'Active Investments', value: stats.activeInvestments.toLocaleString(), icon: TrendingUp, accent: false },
                  { label: 'Pending Actions', value: (stats.pendingDeposits + stats.pendingWithdrawals + stats.pendingKYC).toString(), icon: Clock, accent: true },
                ].map((stat) => (
                  <div key={stat.label} className={`bg-tesla-gray-900 border p-6 ${stat.accent ? 'border-t-2 border-t-tesla-red border-l-0 border-r-0 border-b-0' : 'border-tesla-gray-700'}`}>
                    <div className="flex items-center justify-between mb-4">
                      <stat.icon size={20} className="text-tesla-gray-500" />
                      {stat.accent && <span className="text-xs text-tesla-red font-medium uppercase tracking-wider">Live</span>}
                    </div>
                    <p className="text-2xl font-bold text-tesla-white">{stat.value}</p>
                    <p className="text-xs text-tesla-gray-400 mt-1 uppercase tracking-wider">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Tab Content */}
              {activeTab === 'dashboard' && (
                <div className="space-y-8">
                  {/* Pending Deposits Quick View */}
                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-tesla-white">Pending Deposits</h3>
                      <button onClick={() => setActiveTab('pending')} className="text-xs text-tesla-red hover:text-red-400 transition-colors uppercase tracking-wider">View All</button>
                    </div>
                    <div className="bg-tesla-gray-900 border border-tesla-gray-700 overflow-hidden">
                      <table className="w-full">
                        <thead><tr className="border-b border-tesla-gray-700">
                          <th className="text-left px-6 py-3 text-xs text-tesla-gray-500 uppercase tracking-wider">User</th>
                          <th className="text-left px-6 py-3 text-xs text-tesla-gray-500 uppercase tracking-wider">Method</th>
                          <th className="text-right px-6 py-3 text-xs text-tesla-gray-500 uppercase tracking-wider">Amount</th>
                          <th className="text-right px-6 py-3 text-xs text-tesla-gray-500 uppercase tracking-wider">Actions</th>
                        </tr></thead>
                        <tbody>
                          {deposits.slice(0, 3).map((d) => (
                            <tr key={d.id} className="border-b border-tesla-gray-700/50 hover:bg-tesla-gray-800/50">
                              <td className="px-6 py-4 text-sm text-tesla-white">{d.user?.email || d.userId}</td>
                              <td className="px-6 py-4 text-sm text-tesla-gray-300">{d.method}</td>
                              <td className="px-6 py-4 text-sm text-tesla-white text-right">{formatCurrency(d.amount || 0)}</td>
                              <td className="px-6 py-4 text-right flex justify-end gap-2">
                                <button onClick={() => handleAction('deposits', d.id, 'approve')} className="px-3 py-1.5 text-xs bg-tesla-red/10 text-tesla-red hover:bg-tesla-red/20 transition-colors">Approve</button>
                                <button onClick={() => handleAction('deposits', d.id, 'reject')} className="px-3 py-1.5 text-xs bg-tesla-gray-800 text-tesla-gray-400 hover:text-white transition-colors">Reject</button>
                              </td>
                            </tr>
                          ))}
                          {deposits.length === 0 && <tr><td colSpan={4} className="px-6 py-8 text-center text-tesla-gray-500 text-sm">No pending deposits</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </section>

                  {/* Pending KYC Quick View */}
                  <section>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-semibold text-tesla-white">Pending KYC</h3>
                      <button onClick={() => setActiveTab('kyc')} className="text-xs text-tesla-red hover:text-red-400 transition-colors uppercase tracking-wider">View All</button>
                    </div>
                    <div className="bg-tesla-gray-900 border border-tesla-gray-700 overflow-hidden">
                      <table className="w-full">
                        <thead><tr className="border-b border-tesla-gray-700">
                          <th className="text-left px-6 py-3 text-xs text-tesla-gray-500 uppercase tracking-wider">User</th>
                          <th className="text-left px-6 py-3 text-xs text-tesla-gray-500 uppercase tracking-wider">Document</th>
                          <th className="text-left px-6 py-3 text-xs text-tesla-gray-500 uppercase tracking-wider">Date</th>
                          <th className="text-right px-6 py-3 text-xs text-tesla-gray-500 uppercase tracking-wider">Actions</th>
                        </tr></thead>
                        <tbody>
                          {kycItems.slice(0, 3).map((k) => (
                            <tr key={k.id} className="border-b border-tesla-gray-700/50 hover:bg-tesla-gray-800/50">
                              <td className="px-6 py-4 text-sm text-tesla-white">{k.user?.email || k.userId}</td>
                              <td className="px-6 py-4 text-sm text-tesla-gray-300">{k.docType?.replace('_', ' ')}</td>
                              <td className="px-6 py-4 text-sm text-tesla-gray-400">{new Date(k.createdAt).toLocaleDateString()}</td>
                              <td className="px-6 py-4 text-right flex justify-end gap-2">
                                <button onClick={() => handleAction('kyc', k.id, 'approve')} className="px-3 py-1.5 text-xs bg-tesla-red/10 text-tesla-red hover:bg-tesla-red/20 transition-colors">Approve</button>
                                <button onClick={() => handleAction('kyc', k.id, 'reject')} className="px-3 py-1.5 text-xs bg-tesla-gray-800 text-tesla-gray-400 hover:text-white transition-colors">Reject</button>
                              </td>
                            </tr>
                          ))}
                          {kycItems.length === 0 && <tr><td colSpan={4} className="px-6 py-8 text-center text-tesla-gray-500 text-sm">No pending KYC</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </div>
              )}

              {activeTab === 'user' && (
                <section>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-tesla-white">User Management</h3>
                    <div className="relative">
                      <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-tesla-gray-500" />
                      <input placeholder="Search users..." className="h-10 pl-10 pr-4 bg-tesla-gray-900 border border-tesla-gray-700 text-tesla-white text-sm focus:border-tesla-red rounded-none" />
                    </div>
                  </div>
                  <div className="bg-tesla-gray-900 border border-tesla-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead><tr className="border-b border-tesla-gray-700">
                          <th className="text-left px-6 py-3 text-xs text-tesla-gray-500 uppercase tracking-wider">User</th>
                          <th className="text-left px-6 py-3 text-xs text-tesla-gray-500 uppercase tracking-wider">Role</th>
                          <th className="text-left px-6 py-3 text-xs text-tesla-gray-500 uppercase tracking-wider">KYC Level</th>
                          <th className="text-left px-6 py-3 text-xs text-tesla-gray-500 uppercase tracking-wider">Status</th>
                          <th className="text-left px-6 py-3 text-xs text-tesla-gray-500 uppercase tracking-wider">Joined</th>
                          <th className="text-right px-6 py-3 text-xs text-tesla-gray-500 uppercase tracking-wider">Actions</th>
                        </tr></thead>
                        <tbody>
                          {users.map((u) => (
                            <tr key={u.id} className="border-b border-tesla-gray-700/50 hover:bg-tesla-gray-800/50">
                              <td className="px-6 py-4">
                                <div>
                                  <p className="text-sm text-tesla-white">{u.profile ? `${u.profile.firstName} ${u.profile.lastName}` : '—'}</p>
                                  <p className="text-xs text-tesla-gray-500">{u.email}</p>
                                </div>
                              </td>
                              <td className="px-6 py-4 text-sm text-tesla-gray-300">{u.role}</td>
                              <td className="px-6 py-4"><span className={`text-xs px-2 py-1 ${
                                u.profile?.kycLevel === 'ADVANCED' ? 'bg-green-500/10 text-green-400' :
                                u.profile?.kycLevel === 'INTERMEDIATE' ? 'bg-yellow-500/10 text-yellow-400' :
                                u.profile?.kycLevel === 'BASIC' ? 'bg-blue-500/10 text-blue-400' :
                                'bg-tesla-gray-800 text-tesla-gray-500'
                              }`}>{u.profile?.kycLevel || 'NONE'}</span></td>
                              <td className="px-6 py-4">
                                <span className={`text-xs px-2 py-1 ${u.isActive ? 'bg-green-500/10 text-green-400' : 'bg-tesla-red/10 text-tesla-red'}`}>
                                  {u.isActive ? 'Active' : 'Suspended'}
                                </span>
                                {u.isDemo && <span className="ml-2 text-xs px-2 py-1 bg-yellow-500/10 text-yellow-400">Demo</span>}
                              </td>
                              <td className="px-6 py-4 text-sm text-tesla-gray-400">{new Date(u.createdAt).toLocaleDateString()}</td>
                              <td className="px-6 py-4 text-right">
                                <button className="px-3 py-1.5 text-xs bg-tesla-gray-800 text-tesla-gray-400 hover:text-white transition-colors">
                                  <Eye size={14} className="inline mr-1" />View
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </section>
              )}

              {activeTab === 'pending' && (
                <>
                  <section className="mb-8">
                    <h3 className="text-lg font-semibold text-tesla-white mb-4">Pending Deposits</h3>
                    <div className="bg-tesla-gray-900 border border-tesla-gray-700 overflow-hidden">
                      <table className="w-full">
                        <thead><tr className="border-b border-tesla-gray-700">
                          <th className="text-left px-6 py-3 text-xs text-tesla-gray-500 uppercase tracking-wider">User</th>
                          <th className="text-left px-6 py-3 text-xs text-tesla-gray-500 uppercase tracking-wider">Method</th>
                          <th className="text-right px-6 py-3 text-xs text-tesla-gray-500 uppercase tracking-wider">Amount</th>
                          <th className="text-left px-6 py-3 text-xs text-tesla-gray-500 uppercase tracking-wider">Date</th>
                          <th className="text-right px-6 py-3 text-xs text-tesla-gray-500 uppercase tracking-wider">Actions</th>
                        </tr></thead>
                        <tbody>
                          {deposits.map((d) => (
                            <tr key={d.id} className="border-b border-tesla-gray-700/50 hover:bg-tesla-gray-800/50">
                              <td className="px-6 py-4 text-sm text-tesla-white">{d.user?.email || d.userId}</td>
                              <td className="px-6 py-4 text-sm text-tesla-gray-300">{d.method}</td>
                              <td className="px-6 py-4 text-sm text-tesla-white text-right font-medium">{formatCurrency(d.amount || 0)}</td>
                              <td className="px-6 py-4 text-sm text-tesla-gray-400">{new Date(d.createdAt).toLocaleDateString()}</td>
                              <td className="px-6 py-4 text-right flex justify-end gap-2">
                                <button onClick={() => handleAction('deposits', d.id, 'approve')} className="px-4 py-1.5 text-xs bg-tesla-red text-white hover:bg-red-700 transition-colors flex items-center gap-1"><CheckCircle size={14} />Approve</button>
                                <button onClick={() => handleAction('deposits', d.id, 'reject')} className="px-4 py-1.5 text-xs bg-tesla-gray-800 text-tesla-gray-400 hover:text-white transition-colors flex items-center gap-1"><XCircle size={14} />Reject</button>
                              </td>
                            </tr>
                          ))}
                          {deposits.length === 0 && <tr><td colSpan={5} className="px-6 py-8 text-center text-tesla-gray-500 text-sm">No pending deposits</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </section>
                  <section>
                    <h3 className="text-lg font-semibold text-tesla-white mb-4">Pending Withdrawals</h3>
                    <div className="bg-tesla-gray-900 border border-tesla-gray-700 overflow-hidden">
                      <table className="w-full">
                        <thead><tr className="border-b border-tesla-gray-700">
                          <th className="text-left px-6 py-3 text-xs text-tesla-gray-500 uppercase tracking-wider">User</th>
                          <th className="text-right px-6 py-3 text-xs text-tesla-gray-500 uppercase tracking-wider">Amount</th>
                          <th className="text-right px-6 py-3 text-xs text-tesla-gray-500 uppercase tracking-wider">Fee (21%)</th>
                          <th className="text-right px-6 py-3 text-xs text-tesla-gray-500 uppercase tracking-wider">Net</th>
                          <th className="text-left px-6 py-3 text-xs text-tesla-gray-500 uppercase tracking-wider">Date</th>
                          <th className="text-right px-6 py-3 text-xs text-tesla-gray-500 uppercase tracking-wider">Actions</th>
                        </tr></thead>
                        <tbody>
                          {withdrawals.map((w) => {
                            const fee = (w.amount || 0) * 0.21
                            return (
                              <tr key={w.id} className="border-b border-tesla-gray-700/50 hover:bg-tesla-gray-800/50">
                                <td className="px-6 py-4 text-sm text-tesla-white">{w.user?.email || w.userId}</td>
                                <td className="px-6 py-4 text-sm text-tesla-white text-right">{formatCurrency(w.amount || 0)}</td>
                                <td className="px-6 py-4 text-sm text-tesla-red text-right">{formatCurrency(fee)}</td>
                                <td className="px-6 py-4 text-sm text-tesla-white text-right font-medium">{formatCurrency((w.amount || 0) - fee)}</td>
                                <td className="px-6 py-4 text-sm text-tesla-gray-400">{new Date(w.createdAt).toLocaleDateString()}</td>
                                <td className="px-6 py-4 text-right flex justify-end gap-2">
                                  <button onClick={() => handleAction('withdrawals', w.id, 'approve')} className="px-4 py-1.5 text-xs bg-tesla-red text-white hover:bg-red-700 transition-colors flex items-center gap-1"><CheckCircle size={14} />Approve</button>
                                  <button onClick={() => handleAction('withdrawals', w.id, 'reject')} className="px-4 py-1.5 text-xs bg-tesla-gray-800 text-tesla-gray-400 hover:text-white transition-colors flex items-center gap-1"><XCircle size={14} />Reject</button>
                                </td>
                              </tr>
                            )
                          })}
                          {withdrawals.length === 0 && <tr><td colSpan={6} className="px-6 py-8 text-center text-tesla-gray-500 text-sm">No pending withdrawals</td></tr>}
                        </tbody>
                      </table>
                    </div>
                  </section>
                </>
              )}

              {activeTab === 'kyc' && (
                <section>
                  <h3 className="text-lg font-semibold text-tesla-white mb-4">KYC Verification Review</h3>
                  <div className="bg-tesla-gray-900 border border-tesla-gray-700 overflow-hidden">
                    <table className="w-full">
                      <thead><tr className="border-b border-tesla-gray-700">
                        <th className="text-left px-6 py-3 text-xs text-tesla-gray-500 uppercase tracking-wider">User</th>
                        <th className="text-left px-6 py-3 text-xs text-tesla-gray-500 uppercase tracking-wider">Document Type</th>
                        <th className="text-left px-6 py-3 text-xs text-tesla-gray-500 uppercase tracking-wider">Submitted</th>
                        <th className="text-right px-6 py-3 text-xs text-tesla-gray-500 uppercase tracking-wider">Actions</th>
                      </tr></thead>
                      <tbody>
                        {kycItems.map((k) => (
                          <tr key={k.id} className="border-b border-tesla-gray-700/50 hover:bg-tesla-gray-800/50">
                            <td className="px-6 py-4">
                              <p className="text-sm text-tesla-white">{k.user?.email || k.userId}</p>
                              {k.user?.profile && <p className="text-xs text-tesla-gray-500">{k.user.profile.firstName} {k.user.profile.lastName}</p>}
                            </td>
                            <td className="px-6 py-4 text-sm text-tesla-gray-300">{k.docType?.replace(/_/g, ' ')}</td>
                            <td className="px-6 py-4 text-sm text-tesla-gray-400">{new Date(k.createdAt).toLocaleDateString()}</td>
                            <td className="px-6 py-4 text-right flex justify-end gap-2">
                              <button onClick={() => handleAction('kyc', k.id, 'approve')} className="px-4 py-1.5 text-xs bg-tesla-red text-white hover:bg-red-700 transition-colors flex items-center gap-1"><CheckCircle size={14} />Approve</button>
                              <button onClick={() => handleAction('kyc', k.id, 'reject')} className="px-4 py-1.5 text-xs bg-tesla-gray-800 text-tesla-gray-400 hover:text-white transition-colors flex items-center gap-1"><XCircle size={14} />Reject</button>
                            </td>
                          </tr>
                        ))}
                        {kycItems.length === 0 && <tr><td colSpan={4} className="px-6 py-8 text-center text-tesla-gray-500 text-sm">No pending KYC verifications</td></tr>}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  )
}