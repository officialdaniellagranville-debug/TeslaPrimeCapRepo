'use client'

import { useRef, useEffect, useState, useCallback } from 'react'
import { ChevronLeft, ChevronRight, Star } from 'lucide-react'

interface Testimonial {
  name: string
  role: string
  quote: string
  rating: number
  initials: string
  color: string
}

const testimonials: Testimonial[] = [
  { name: 'Sarah Mitchell', role: 'CEO at TechStart', quote: 'VaultEdge completely transformed how we manage our company finances. The real-time dashboard and instant transfers save us hours every week.', rating: 5, initials: 'SM', color: '#10B981' },
  { name: 'James Rodriguez', role: 'Freelance Designer', quote: 'As a freelancer, I need banking that keeps up with my lifestyle. The mobile deposit feature is a game-changer — no more branch visits!', rating: 5, initials: 'JR', color: '#14B8A6' },
  { name: 'Emily Chen', role: 'Small Business Owner', quote: 'The business banking tools are incredible. Invoice payments, payroll processing, and the dedicated support team make everything seamless.', rating: 5, initials: 'EC', color: '#06B6D4' },
  { name: 'David Thompson', role: 'Retired Teacher', quote: 'I switched from my old bank and immediately noticed the difference. Higher savings rates, no hidden fees, and the app is so easy to use.', rating: 4, initials: 'DT', color: '#A855F7' },
  { name: 'Amanda Foster', role: 'Software Engineer', quote: 'The investment management tools helped me grow my portfolio by 23% this year. The AI-powered insights are remarkably accurate.', rating: 5, initials: 'AF', color: '#F59E0B' },
  { name: 'Michael Park', role: 'Medical Professional', quote: 'Security was my top priority. VaultEdge\'s 2FA, biometric login, and real-time alerts give me complete peace of mind.', rating: 5, initials: 'MP', color: '#EF4444' },
]

export default function HorizontalTestimonials() {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [currentIdx, setCurrentIdx] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const autoScrollRef = useRef<ReturnType<typeof setInterval> | null>(null)

  const getCardWidth = () => 320 + 16

  const scrollTo = useCallback((idx: number) => {
    const el = scrollRef.current
    if (!el) return
    const maxIdx = Math.max(0, testimonials.length - Math.floor(el.clientWidth / getCardWidth()))
    const clamped = Math.max(0, Math.min(idx, maxIdx))
    el.scrollTo({ left: clamped * getCardWidth(), behavior: 'smooth' })
    setCurrentIdx(clamped)
  }, [])

  const scrollPrev = useCallback(() => scrollTo(currentIdx - 1), [currentIdx, scrollTo])
  const scrollNext = useCallback(() => scrollTo(currentIdx + 1), [currentIdx, scrollTo])

  const handleScroll = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const idx = Math.round(el.scrollLeft / getCardWidth())
    setCurrentIdx(idx)
  }, [])

  useEffect(() => {
    if (isPaused) return
    autoScrollRef.current = setInterval(() => {
      scrollTo(currentIdx + 1)
    }, 5000)
    return () => {
      if (autoScrollRef.current) clearInterval(autoScrollRef.current)
    }
  }, [currentIdx, isPaused, scrollTo])

  return (
    <div className="w-full" onMouseEnter={() => setIsPaused(true)} onMouseLeave={() => setIsPaused(false)}>
      <div className="relative">
        <button onClick={scrollPrev} className="absolute left-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-background border border-border shadow-md flex items-center justify-center hover:bg-muted transition-colors">
          <ChevronLeft className="w-4 h-4" />
        </button>
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="flex gap-4 overflow-x-auto snap-x snap-mandatory px-12 py-2 scroll-smooth no-scrollbar"
        >
          {testimonials.map((t, i) => (
            <div key={i} className="w-80 shrink-0 snap-start">
              <div className="h-full rounded-2xl border border-border/50 bg-card/60 backdrop-blur-lg p-6 shadow-lg flex flex-col">
                <p className="text-sm italic text-muted-foreground leading-relaxed flex-1 mb-4">
                  &ldquo;{t.quote}&rdquo;
                </p>
                <div className="flex items-center gap-1 mb-4">
                  {Array.from({ length: 5 }).map((_, s) => (
                    <Star key={s} className={`w-3.5 h-3.5 ${s < t.rating ? 'fill-amber-400 text-amber-400' : 'text-muted-foreground/30'}`} />
                  ))}
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-sm font-bold" style={{ backgroundColor: t.color }}>
                    {t.initials}
                  </div>
                  <div>
                    <p className="text-sm font-semibold text-foreground">{t.name}</p>
                    <p className="text-xs text-muted-foreground">{t.role}</p>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
        <button onClick={scrollNext} className="absolute right-0 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-background border border-border shadow-md flex items-center justify-center hover:bg-muted transition-colors">
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
      <div className="flex justify-center gap-1.5 mt-4">
        {testimonials.map((_, i) => (
          <button key={i} onClick={() => scrollTo(i)} className={`rounded-full transition-all duration-300 ${i === currentIdx ? 'w-6 h-2 bg-primary' : 'w-2 h-2 bg-muted-foreground/30 hover:bg-muted-foreground/50'}`} />
        ))}
      </div>
    </div>
  )
}