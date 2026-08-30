'use client'

import { useRef, useEffect, useState, useCallback } from 'react'

interface DonutData {
  label: string
  value: number
  color: string
}

interface DonutChartProps {
  data?: DonutData[]
  size?: number
}

const defaultData: DonutData[] = [
  { label: 'Housing', value: 2400, color: '#10B981' },
  { label: 'Food', value: 850, color: '#14B8A6' },
  { label: 'Transport', value: 380, color: '#06B6D4' },
  { label: 'Entertainment', value: 220, color: '#A855F7' },
  { label: 'Utilities', value: 150, color: '#F59E0B' },
]

export default function DonutChart({ data = defaultData, size = 200 }: DonutChartProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [tooltip, setTooltip] = useState<{ x: number; y: number; label: string; value: number } | null>(null)
  const animRef = useRef<number>(0)
  const segmentsRef = useRef<{ startAngle: number; endAngle: number; data: DonutData }[]>([])

  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1
  const canvasSize = size
  const center = canvasSize / 2
  const radius = canvasSize / 2 - 16
  const innerRadius = radius * 0.6
  const total = data.reduce((s, d) => s + d.value, 0)

  const draw = useCallback(
    (progress: number) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const ctx = canvas.getContext('2d')
      if (!ctx) return

      ctx.clearRect(0, 0, canvasSize * dpr, canvasSize * dpr)
      ctx.save()
      ctx.scale(dpr, dpr)

      const segments: { startAngle: number; endAngle: number; data: DonutData }[] = []
      let currentAngle = -Math.PI / 2
      const gap = 0.03

      data.forEach((item) => {
        const sliceAngle = (item.value / total) * Math.PI * 2 * progress
        segments.push({
          startAngle: currentAngle + gap / 2,
          endAngle: currentAngle + sliceAngle - gap / 2,
          data: item,
        })
        currentAngle += sliceAngle
      })
      segmentsRef.current = segments

      segments.forEach((seg) => {
        if (seg.endAngle <= seg.startAngle) return
        ctx.beginPath()
        ctx.arc(center, center, radius, seg.startAngle, seg.endAngle)
        ctx.arc(center, center, innerRadius, seg.endAngle, seg.startAngle, true)
        ctx.closePath()
        ctx.fillStyle = seg.data.color
        ctx.fill()
      })

      ctx.fillStyle = '#0f172a'
      ctx.font = 'bold 22px system-ui, sans-serif'
      ctx.textAlign = 'center'
      ctx.textBaseline = 'middle'
      const displayTotal = Math.round(total * progress)
      ctx.fillText(`$${displayTotal.toLocaleString()}`, center, center - 6)
      ctx.fillStyle = '#64748b'
      ctx.font = '11px system-ui, sans-serif'
      ctx.fillText('Total Spent', center, center + 14)

      ctx.restore()
    },
    [data, total, canvasSize, center, radius, innerRadius, dpr]
  )

  useEffect(() => {
    const startTime = performance.now()
    const duration = 1000

    const animate = (now: number) => {
      const elapsed = now - startTime
      const t = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - t, 3)
      draw(eased)
      if (t < 1) {
        animRef.current = requestAnimationFrame(animate)
      }
    }
    animRef.current = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animRef.current)
  }, [draw])

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const rect = canvas.getBoundingClientRect()
      const mx = e.clientX - rect.left
      const my = e.clientY - rect.top
      const dx = mx - center
      const dy = my - center
      const dist = Math.sqrt(dx * dx + dy * dy)

      if (dist < innerRadius || dist > radius) {
        setTooltip(null)
        return
      }

      let angle = Math.atan2(dy, dx)
      if (angle < -Math.PI / 2) angle += Math.PI * 2

      for (const seg of segmentsRef.current) {
        let sa = seg.startAngle
        let ea = seg.endAngle
        if (sa < -Math.PI / 2) sa += Math.PI * 2
        if (ea < -Math.PI / 2) ea += Math.PI * 2
        if (angle >= sa && angle <= ea) {
          setTooltip({ x: mx, y: my, label: seg.data.label, value: seg.data.value })
          return
        }
      }
      setTooltip(null)
    },
    [center, innerRadius, radius]
  )

  const handleMouseLeave = useCallback(() => setTooltip(null), [])

  return (
    <div className="flex flex-col items-center">
      <div className="relative inline-block">
        <canvas
          ref={canvasRef}
          width={canvasSize * dpr}
          height={canvasSize * dpr}
          style={{ width: canvasSize, height: canvasSize }}
          className="cursor-pointer"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        />
        {tooltip && (
          <div
            className="absolute pointer-events-none bg-gray-900 text-white text-xs px-3 py-2 rounded-lg shadow-lg z-10 whitespace-nowrap"
            style={{ left: tooltip.x + 12, top: tooltip.y - 10 }}
          >
            <p className="font-semibold">{tooltip.label}</p>
            <p>${tooltip.value.toLocaleString()}</p>
          </div>
        )}
      </div>
      <div className="flex flex-wrap justify-center gap-x-5 gap-y-2 mt-4 max-w-[300px]">
        {data.map((item) => (
          <div key={item.label} className="flex items-center gap-2 text-sm">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
            <span className="text-muted-foreground">{item.label}</span>
            <span className="font-medium text-foreground">{Math.round((item.value / total) * 100)}%</span>
          </div>
        ))}
      </div>
    </div>
  )
}
