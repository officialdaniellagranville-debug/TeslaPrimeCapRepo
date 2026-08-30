'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

export default function CreditCard3D() {
  const [isFlipped, setIsFlipped] = useState(false)
  const [tilt, setTilt] = useState({ x: 0, y: 0 })
  const [mousePos, setMousePos] = useState({ x: 50, y: 50 })
  const cardRef = useRef<HTMLDivElement>(null)

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!cardRef.current) return
    const rect = cardRef.current.getBoundingClientRect()
    const x = (e.clientX - rect.left) / rect.width
    const y = (e.clientY - rect.top) / rect.height
    setMousePos({ x: x * 100, y: y * 100 })
    const rotateY = (x - 0.5) * 30
    const rotateX = (0.5 - y) * 30
    setTilt({ x: Math.max(-15, Math.min(15, rotateX)), y: Math.max(-15, Math.min(15, rotateY)) })
  }, [])

  const handleMouseLeave = useCallback(() => {
    setTilt({ x: 0, y: 0 })
    setMousePos({ x: 50, y: 50 })
  }, [])

  const handleClick = useCallback(() => {
    setIsFlipped((f) => !f)
  }, [])

  useEffect(() => {
    const handleTouchMove = (e: TouchEvent) => {
      if (!cardRef.current) return
      const touch = e.touches[0]
      const rect = cardRef.current.getBoundingClientRect()
      const x = (touch.clientX - rect.left) / rect.width
      const y = (touch.clientY - rect.top) / rect.height
      setMousePos({ x: x * 100, y: y * 100 })
      const rotateY = (x - 0.5) * 30
      const rotateX = (0.5 - y) * 30
      setTilt({ x: Math.max(-15, Math.min(15, rotateX)), y: Math.max(-15, Math.min(15, rotateY)) })
    }
    const el = cardRef.current
    el?.addEventListener('touchmove', handleTouchMove as EventListener)
    return () => el?.removeEventListener('touchmove', handleTouchMove as EventListener)
  }, [])

  const holographicStyle = {
    background: `radial-gradient(circle at ${mousePos.x}% ${mousePos.y}%, rgba(255,255,255,0.25) 0%, transparent 50%),
      linear-gradient(${mousePos.x * 0.5 + 125}deg, 
        rgba(16,185,129,0.4) 0%, 
        rgba(6,182,212,0.4) 25%, 
        rgba(168,85,247,0.3) 50%, 
        rgba(245,158,11,0.3) 75%, 
        rgba(16,185,129,0.4) 100%)`,
  }

  const shimmerAngle = mousePos.x * 3.6

  return (
    <div className="flex items-center justify-center py-8">
      <div
        ref={cardRef}
        className="relative cursor-pointer"
        style={{ perspective: '1000px', width: 360, height: 220 }}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        onClick={handleClick}
      >
        <div
          className="w-full h-full relative"
          style={{
            transformStyle: 'preserve-3d',
            transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg) rotateY(${isFlipped ? 180 : 0}deg)`,
            transition: isFlipped ? 'transform 0.8s cubic-bezier(0.4,0,0.2,1)' : 'transform 0.15s ease-out',
          }}
        >
          {/* Front */}
          <div
            className="absolute inset-0 rounded-2xl shadow-2xl overflow-hidden"
            style={{ backfaceVisibility: 'hidden', ...holographicStyle }}
          >
            <div className="absolute inset-0 bg-gradient-to-br from-gray-900/80 via-gray-800/60 to-gray-900/80 rounded-2xl" />
            <div
              className="absolute inset-0 rounded-2xl pointer-events-none"
              style={{
                background: `linear-gradient(${shimmerAngle}deg, transparent 30%, rgba(255,255,255,0.08) 45%, rgba(255,255,255,0.15) 50%, rgba(255,255,255,0.08) 55%, transparent 70%)`,
                transition: 'background 0.1s',
              }}
            />
            <div className="relative z-10 flex flex-col justify-between h-full p-6">
              <div className="flex justify-between items-start">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-emerald-400 to-teal-500 flex items-center justify-center">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                    </svg>
                  </div>
                  <span className="text-white font-bold text-lg tracking-wide">VaultEdge</span>
                </div>
                <svg width="48" height="16" viewBox="0 0 48 16" className="opacity-90">
                  <text x="0" y="14" fill="#f59e0b" fontFamily="italic serif" fontSize="18" fontWeight="bold">VISA</text>
                </svg>
              </div>
              <div>
                <p className="text-white/90 text-xl tracking-[0.25em] font-mono mb-4">
                  •••• •••• •••• 4829
                </p>
                <div className="flex justify-between items-end">
                  <div>
                    <p className="text-white/50 text-[10px] uppercase tracking-wider mb-0.5">Card Holder</p>
                    <p className="text-white font-semibold text-sm tracking-wider">ALEX JOHNSON</p>
                  </div>
                  <div className="text-right">
                    <p className="text-white/50 text-[10px] uppercase tracking-wider mb-0.5">Expires</p>
                    <p className="text-white font-semibold text-sm">12/28</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Back */}
          <div
            className="absolute inset-0 rounded-2xl shadow-2xl overflow-hidden"
            style={{
              backfaceVisibility: 'hidden',
              transform: 'rotateY(180deg)',
              background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
            }}
          >
            <div className="relative z-10 flex flex-col h-full">
              <div className="w-full h-12 bg-gray-900/80 mt-6" />
              <div className="flex-1 px-6 pt-6 flex flex-col justify-between">
                <div>
                  <div className="bg-white/10 rounded px-4 py-2 mb-4">
                    <p className="text-white/50 text-[10px] uppercase tracking-wider">CVV</p>
                    <p className="text-white font-mono text-lg tracking-widest">***</p>
                  </div>
                  <div className="h-8 w-full bg-gradient-to-r from-white/20 via-white/5 to-white/20 rounded-sm" />
                </div>
                <div className="pb-6">
                  <p className="text-white/30 text-[8px] leading-relaxed">
                    This card is property of VaultEdge Bank. Unauthorized use is prohibited.
                    Contact 1-800-VAULTED for support. Cardholder agreement applies.
                  </p>
                  <div className="flex justify-end mt-2">
                    <div className="w-10 h-6 bg-gradient-to-r from-amber-400 to-amber-500 rounded-sm opacity-60" />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        <p className="text-center text-xs text-muted-foreground mt-3">Click to flip • Hover to tilt</p>
      </div>
    </div>
  )
}
