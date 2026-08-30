'use client'

import { useState, useEffect, useRef } from 'react'

interface CreditScoreGaugeProps {
  score?: number
}

const ranges = [
  { min: 300, max: 579, color: '#EF4444', label: 'Poor' },
  { min: 580, max: 669, color: '#F97316', label: 'Fair' },
  { min: 670, max: 739, color: '#EAB308', label: 'Good' },
  { min: 740, max: 799, color: '#22C55E', label: 'Very Good' },
  { min: 800, max: 850, color: '#10B981', label: 'Excellent' },
]

function getRating(score: number) {
  return ranges.find((r) => score >= r.min && score <= r.max) || ranges[2]
}

export default function CreditScoreGauge({ score = 742 }: CreditScoreGaugeProps) {
  const [animatedScore, setAnimatedScore] = useState(0)
  const [animatedAngle, setAnimatedAngle] = useState(0)
  const gaugeRef = useRef<SVGSVGElement>(null)

  const rating = getRating(score)
  const totalRange = 850 - 300
  const scoreFraction = (score - 300) / totalRange
  const startAngle = -210
  const endAngle = 30
  const totalSweep = endAngle - startAngle
  const targetAngle = startAngle + totalSweep * scoreFraction

  useEffect(() => {
    const startTime = performance.now()
    const duration = 1500

    const animate = (now: number) => {
      const elapsed = now - startTime
      const t = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - t, 4)
      setAnimatedScore(Math.round(score * eased + 300 * (1 - eased)))
      setAnimatedAngle(startAngle + totalSweep * scoreFraction * eased)
      if (t < 1) requestAnimationFrame(animate)
    }
    requestAnimationFrame(animate)
  }, [score, scoreFraction, totalSweep])

  const cx = 150
  const cy = 150
  const r = 110

  function polarToCart(angle: number, radius: number) {
    const rad = (angle * Math.PI) / 180
    return {
      x: cx + radius * Math.cos(rad),
      y: cy + radius * Math.sin(rad),
    }
  }

  function describeArc(s: number, e: number) {
    const start = polarToCart(s, r)
    const end = polarToCart(e, r)
    const large = e - s > 180 ? 1 : 0
    return `M ${start.x} ${start.y} A ${r} ${r} 0 ${large} 1 ${end.x} ${end.y}`
  }

  const needleTip = polarToCart(animatedAngle, r - 15)
  const perpAngle = ((animatedAngle + 90) * Math.PI) / 180
  const needleBaseL = {
    x: cx + 8 * Math.cos(perpAngle),
    y: cy + 8 * Math.sin(perpAngle),
  }
  const needleBaseR = {
    x: cx - 8 * Math.cos(perpAngle),
    y: cy - 8 * Math.sin(perpAngle),
  }

  return (
    <div className="flex flex-col items-center">
      <svg ref={gaugeRef} viewBox="0 0 300 200" className="w-full max-w-sm">
        {ranges.map((range) => {
          const s = startAngle + ((range.min - 300) / totalRange) * totalSweep
          const e = startAngle + ((range.max - 300) / totalRange) * totalSweep
          return (
            <path
              key={range.label}
              d={describeArc(s, e)}
              fill="none"
              stroke={range.color}
              strokeWidth={18}
              strokeLinecap="butt"
              opacity={0.25}
            />
          )
        })}
        {(() => {
          const activeEnd = startAngle + totalSweep * scoreFraction
          let d = ''
          let builtAngle = startAngle
          for (const range of ranges) {
            const s = startAngle + ((range.min - 300) / totalRange) * totalSweep
            const e = startAngle + ((range.max - 300) / totalRange) * totalSweep
            if (builtAngle >= activeEnd) break
            const segStart = Math.max(builtAngle, s)
            const segEnd = Math.min(activeEnd, e)
            if (segEnd > segStart) {
              const st = polarToCart(segStart, r)
              const en = polarToCart(segEnd, r)
              const large = segEnd - segStart > 180 ? 1 : 0
              d += `M ${st.x} ${st.y} A ${r} ${r} 0 ${large} 1 ${en.x} ${en.y} `
            }
            builtAngle = e
          }
          return (
            <path d={d} fill="none" stroke={rating.color} strokeWidth={18} strokeLinecap="round" opacity={0.9} />
          )
        })()}
        <polygon
          points={`${needleTip.x},${needleTip.y} ${needleBaseL.x},${needleBaseL.y} ${needleBaseR.x},${needleBaseR.y}`}
          fill={rating.color}
          className="drop-shadow-lg"
        />
        <circle cx={cx} cy={cy} r={10} fill={rating.color} />
        <circle cx={cx} cy={cy} r={5} className="fill-background" />
        <text x={cx} y={cy + 45} textAnchor="middle" className="fill-foreground" fontSize="42" fontWeight="bold">
          {animatedScore}
        </text>
        <text x={cx} y={cy + 68} textAnchor="middle" fontSize="14" fontWeight="600" fill={rating.color}>
          {rating.label}
        </text>
        <text x={cx - r - 5} y={cy + 22} textAnchor="end" className="fill-muted-foreground" fontSize="10">300</text>
        <text x={cx + r + 5} y={cy + 22} textAnchor="start" className="fill-muted-foreground" fontSize="10">850</text>
      </svg>
    </div>
  )
}