'use client'

import { useRef, useEffect, useState } from 'react'

interface Goal {
  name: string
  current: number
  target: number
  color: string
  icon: string
}

interface SavingsGoalRingProps {
  goals?: Goal[]
}

const defaultGoals: Goal[] = [
  { name: 'Vacation Fund', current: 2800, target: 4000, color: '#10B981', icon: '✈️' },
  { name: 'Emergency', current: 8500, target: 10000, color: '#14B8A6', icon: '🛡️' },
  { name: 'New Car', current: 12000, target: 35000, color: '#06B6D4', icon: '🚗' },
  { name: 'Education', current: 15000, target: 50000, color: '#A855F7', icon: '🎓' },
]

function formatCurrency(v: number) {
  if (v >= 1000) return `$${(v / 1000).toFixed(v % 1000 === 0 ? 0 : 1)}k`
  return `$${v}`
}

function GoalRing({ goal, isVisible }: { goal: Goal; isVisible: boolean }) {
  const [progress, setProgress] = useState(0)
  const size = 120
  const strokeWidth = 8
  const radius = (size - strokeWidth) / 2
  const circumference = 2 * Math.PI * radius
  const pct = Math.min(goal.current / goal.target, 1)

  useEffect(() => {
    if (!isVisible) return
    const startTime = performance.now()
    const duration = 1200
    const animate = (now: number) => {
      const t = Math.min((now - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      setProgress(pct * eased)
      if (t < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [isVisible, pct])

  const offset = circumference - progress * circumference

  return (
    <div className="flex flex-col items-center gap-2">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={radius} fill="none" stroke="currentColor" strokeWidth={strokeWidth} className="text-muted/30" />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={goal.color}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            className="transition-[stroke-dashoffset] duration-100"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-base font-bold text-foreground">{Math.round(progress * 100)}%</span>
          <span className="text-[10px] text-muted-foreground">
            {formatCurrency(goal.current)}/{formatCurrency(goal.target)}
          </span>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        <span className="text-base">{goal.icon}</span>
        <span className="text-xs font-medium text-foreground">{goal.name}</span>
      </div>
    </div>
  )
}

export default function SavingsGoalRing({ goals = defaultGoals }: SavingsGoalRingProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isVisible, setIsVisible] = useState(false)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          obs.disconnect()
        }
      },
      { threshold: 0.2 }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  return (
    <div ref={containerRef} className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-6 justify-items-center">
      {goals.map((goal) => (
        <GoalRing key={goal.name} goal={goal} isVisible={isVisible} />
      ))}
    </div>
  )
}