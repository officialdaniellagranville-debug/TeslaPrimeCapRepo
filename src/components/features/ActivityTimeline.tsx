'use client'

import { useRef, useEffect, useState } from 'react'

interface Transaction {
  date: string
  description: string
  amount: string
  type: 'credit' | 'debit'
  category: string
  icon: string
}

interface ActivityTimelineProps {
  transactions?: Transaction[]
}

const defaultTransactions: Transaction[] = [
  { date: '2024-01-15', description: 'Salary Deposit', amount: '$5,200.00', type: 'credit', category: 'Income', icon: '💰' },
  { date: '2024-01-15', description: 'Netflix Subscription', amount: '$15.99', type: 'debit', category: 'Entertainment', icon: '🎬' },
  { date: '2024-01-14', description: 'Whole Foods Market', amount: '$87.32', type: 'debit', category: 'Groceries', icon: '🛒' },
  { date: '2024-01-14', description: 'Freelance Payment', amount: '$1,200.00', type: 'credit', category: 'Income', icon: '💼' },
  { date: '2024-01-13', description: 'Electric Bill', amount: '$124.50', type: 'debit', category: 'Utilities', icon: '⚡' },
  { date: '2024-01-12', description: 'Uber Ride', amount: '$23.75', type: 'debit', category: 'Transport', icon: '🚕' },
  { date: '2024-01-12', description: 'Coffee Shop', amount: '$6.50', type: 'debit', category: 'Food', icon: '☕' },
]

const categoryColors: Record<string, string> = {
  Income: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
  Entertainment: 'bg-purple-500/15 text-purple-600 dark:text-purple-400',
  Groceries: 'bg-teal-500/15 text-teal-600 dark:text-teal-400',
  Utilities: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  Transport: 'bg-cyan-500/15 text-cyan-600 dark:text-cyan-400',
  Food: 'bg-orange-500/15 text-orange-600 dark:text-orange-400',
}

export default function ActivityTimeline({ transactions = defaultTransactions }: ActivityTimelineProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [visibleItems, setVisibleItems] = useState<Set<number>>(new Set())

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const idx = Number(entry.target.getAttribute('data-idx'))
            setVisibleItems((prev) => new Set(prev).add(idx))
          }
        })
      },
      { threshold: 0.1, rootMargin: '0px 0px -20px 0px' }
    )
    el.querySelectorAll('[data-idx]').forEach((child) => obs.observe(child))
    return () => obs.disconnect()
  }, [transactions])

  const grouped = transactions.reduce<Record<string, Transaction[]>>((acc, tx) => {
    if (!acc[tx.date]) acc[tx.date] = []
    acc[tx.date].push(tx)
    return acc
  }, {})

  let globalIdx = 0

  return (
    <div ref={containerRef} className="relative max-h-96 overflow-y-auto pr-2 custom-scrollbar">
      <div className="absolute left-[18px] top-2 bottom-2 w-px bg-border" />
      {Object.entries(grouped).map(([date, txs]) => (
        <div key={date}>
          <div className="flex items-center gap-3 mb-3 pl-10">
            <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
              {new Date(date + 'T00:00:00').toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
            </span>
          </div>
          {txs.map((tx) => {
            const idx = globalIdx++
            const isVisible = visibleItems.has(idx)
            return (
              <div
                key={idx}
                data-idx={idx}
                className={`flex items-start gap-4 mb-4 transition-all duration-500 ${isVisible ? 'opacity-100 translate-x-0' : 'opacity-0 -translate-x-6'}`}
              >
                <div className="relative z-10 mt-0.5 w-9 h-9 rounded-full bg-muted flex items-center justify-center text-base shrink-0">
                  {tx.icon}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-sm font-medium text-foreground truncate">{tx.description}</p>
                    <span className={`text-sm font-semibold whitespace-nowrap ${tx.type === 'credit' ? 'text-emerald-500' : 'text-red-500'}`}>
                      {tx.type === 'credit' ? '+' : '-'}{tx.amount}
                    </span>
                  </div>
                  <span className={`inline-block mt-1 text-[10px] px-2 py-0.5 rounded-full font-medium ${categoryColors[tx.category] || 'bg-muted text-muted-foreground'}`}>
                    {tx.category}
                  </span>
                </div>
              </div>
            )
          })}
        </div>
      ))}
    </div>
  )
}
