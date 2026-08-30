'use client'

import { useRef, useEffect } from 'react'

interface SparkLineProps {
  data?: number[]
  width?: number
  height?: number
  color?: string
  showGradient?: boolean
}

const defaultData = [45, 52, 48, 61, 55, 67, 72, 68, 78, 82, 75, 88]

export default function SparkLine({
  data = defaultData,
  width = 120,
  height = 40,
  color = '#10B981',
  showGradient = true,
}: SparkLineProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    canvas.width = width * dpr
    canvas.height = height * dpr
    ctx.scale(dpr, dpr)

    const min = Math.min(...data)
    const max = Math.max(...data)
    const range = max - min || 1
    const padding = 2
    const w = width - padding * 2
    const h = height - padding * 2

    const points = data.map((v, i) => ({
      x: padding + (i / (data.length - 1)) * w,
      y: padding + h - ((v - min) / range) * h,
    }))

    const startTime = performance.now()
    const duration = 800

    const animate = (now: number) => {
      const elapsed = now - startTime
      const t = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - t, 2)
      const visibleCount = Math.max(2, Math.ceil(points.length * eased))
      const visiblePoints = points.slice(0, visibleCount)

      ctx.clearRect(0, 0, width, height)

      if (showGradient) {
        const grad = ctx.createLinearGradient(0, 0, 0, height)
        grad.addColorStop(0, color + '40')
        grad.addColorStop(1, color + '00')
        ctx.beginPath()
        ctx.moveTo(visiblePoints[0].x, visiblePoints[0].y)
        for (let i = 1; i < visiblePoints.length; i++) {
          const prev = visiblePoints[i - 1]
          const curr = visiblePoints[i]
          const cpx = (prev.x + curr.x) / 2
          ctx.bezierCurveTo(cpx, prev.y, cpx, curr.y, curr.x, curr.y)
        }
        ctx.lineTo(visiblePoints[visiblePoints.length - 1].x, height)
        ctx.lineTo(visiblePoints[0].x, height)
        ctx.closePath()
        ctx.fillStyle = grad
        ctx.fill()
      }

      ctx.beginPath()
      ctx.moveTo(visiblePoints[0].x, visiblePoints[0].y)
      for (let i = 1; i < visiblePoints.length; i++) {
        const prev = visiblePoints[i - 1]
        const curr = visiblePoints[i]
        const cpx = (prev.x + curr.x) / 2
        ctx.bezierCurveTo(cpx, prev.y, cpx, curr.y, curr.x, curr.y)
      }
      ctx.strokeStyle = color
      ctx.lineWidth = 2
      ctx.lineJoin = 'round'
      ctx.lineCap = 'round'
      ctx.stroke()

      const last = visiblePoints[visiblePoints.length - 1]
      ctx.beginPath()
      ctx.arc(last.x, last.y, 2.5, 0, Math.PI * 2)
      ctx.fillStyle = color
      ctx.fill()

      if (t < 1) requestAnimationFrame(animate)
    }

    requestAnimationFrame(animate)
  }, [data, width, height, color, showGradient, dpr])

  return (
    <canvas
      ref={canvasRef}
      style={{ width, height }}
      className="block"
    />
  )
}
