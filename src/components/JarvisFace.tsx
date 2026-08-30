'use client'
import { useState, useEffect } from 'react'

export default function JarvisFace({ state, size = 260 }: { state: string; size?: number }) {
  const [blink, setBlink] = useState(false)
  useEffect(() => {
    if (state === 'idle' || state === 'offline') {
      const iv = setInterval(() => { setBlink(true); setTimeout(() => setBlink(false), 150) }, 3500 + Math.random() * 2500)
      return () => clearInterval(iv)
    } else { setBlink(false) }
  }, [state])

  const sp = state === 'speaking'
  const th = state === 'thinking'
  const li = state === 'listening'
  const id = state === 'idle'
  const off = state === 'offline'

  const fAnim = off ? 'none' : id ? 'face-breath 5s ease-in-out infinite' : th ? 'face-tilt 3s ease-in-out infinite' : li ? 'face-lean 1.5s ease-in-out infinite' : 'face-breath 1.8s ease-in-out infinite, speak-aura 1.8s ease-in-out infinite'
  const pAnimL = off ? 'none' : id ? 'eye-drift 6s ease-in-out infinite' : th ? 'eye-focus-pulse 1.2s ease-in-out infinite' : li ? 'iris-widen 1.2s ease-in-out infinite' : 'none'
  const pAnimR = off ? 'none' : id ? 'eye-drift 6s ease-in-out infinite 0.4s' : th ? 'eye-focus-pulse 1.2s ease-in-out infinite 0.4s' : li ? 'iris-widen 1.2s ease-in-out infinite 0.4s' : 'none'
  const iScale = li ? 'scale(1.35)' : 'scale(1)'
  const eSY = blink ? 'scaleY(0.05)' : th ? 'scaleY(0.82)' : sp ? 'scaleY(0.78)' : li ? 'scaleY(1.12)' : 'scaleY(1)'
  const op = off ? 0.2 : 1

  return (
    <svg viewBox='0 0 300 300' width={size} height={size} style={{ animation: fAnim, transformOrigin: '150px 150px', opacity: op, transition: 'opacity 0.8s' }}>
      <defs>
        <radialGradient id='jfg'><stop offset='0%' stopColor='rgba(0,229,255,0.06)'/><stop offset='60%' stopColor='rgba(0,229,255,0.02)'/><stop offset='100%' stopColor='transparent'/></radialGradient>
        <radialGradient id='jeg'><stop offset='0%' stopColor='rgba(0,229,255,0.45)'/><stop offset='100%' stopColor='rgba(0,229,255,0.05)'/></radialGradient>
        <filter id='jgl'><feGaussianBlur stdDeviation='1.5' result='b'/><feMerge><feMergeNode in='b'/><feMergeNode in='SourceGraphic'/></feMerge></filter>
      </defs>
      <circle cx='150' cy='150' r='78' fill='url(#jfg)'/>
      <circle cx='150' cy='150' r='146' fill='none' stroke='rgba(0,229,255,0.06)' strokeWidth='0.6' strokeDasharray='12 6 3 6' style={{ animation: li ? 'listen-ring-p 1.2s ease-in-out infinite, jf-cw 35s linear infinite' : 'jf-cw 35s linear infinite', transformOrigin: '150px 150px' }}/>
      <circle cx='150' cy='150' r='133' fill='none' stroke='rgba(0,229,255,0.08)' strokeWidth='0.5' strokeDasharray='20 8 5 8' style={{ animation: li ? 'listen-ring-p 1.2s ease-in-out infinite .15s, jf-ccw 28s linear infinite' : 'jf-ccw 28s linear infinite', transformOrigin: '150px 150px' }}/>
      <circle cx='150' cy='150' r='121' fill='none' stroke='rgba(0,229,255,0.05)' strokeWidth='0.5' strokeDasharray='5 12' style={{ animation: th ? 'jf-cw 6s linear infinite' : 'jf-cw 22s linear infinite', transformOrigin: '150px 150px' }}/>
      <circle cx='150' cy='150' r='109' fill='none' stroke='rgba(0,229,255,0.035)' strokeWidth='0.4' style={{ animation: 'jf-ccw 40s linear infinite', transformOrigin: '150px 150px' }}/>
      <path d='M 100 88 Q 150 70 200 88' fill='none' stroke='rgba(0,229,255,0.1)' strokeWidth='0.7'/>
      <path d='M 100 208 Q 150 226 200 208' fill='none' stroke='rgba(0,229,255,0.08)' strokeWidth='0.7'/>
      <path d='M 88 108 L 80 96' fill='none' stroke='rgba(0,229,255,0.06)' strokeWidth='0.5'/>
      <path d='M 212 108 L 220 96' fill='none' stroke='rgba(0,229,255,0.06)' strokeWidth='0.5'/>
      <line x1='88' y1='155' x2='82' y2='168' stroke='rgba(0,229,255,0.05)' strokeWidth='0.4'/>
      <line x1='212' y1='155' x2='218' y2='168' stroke='rgba(0,229,255,0.05)' strokeWidth='0.4'/>
      <circle cx='76' cy='118' r='2' fill='rgba(0,229,255,0.18)' style={{ animation: li ? 'hud-pulse 0.8s ease-in-out infinite' : 'hud-pulse 4s ease-in-out infinite' }}/>
      <circle cx='224' cy='118' r='2' fill='rgba(0,229,255,0.18)' style={{ animation: li ? 'hud-pulse 0.8s ease-in-out infinite .1s' : 'hud-pulse 4s ease-in-out infinite 1.2s' }}/>
      <circle cx='150' cy='76' r='1.5' fill='rgba(0,229,255,0.12)' style={{ animation: 'hud-pulse 5s ease-in-out infinite .5s' }}/>
      <circle cx='105' cy='82' r='1' fill='rgba(0,229,255,0.08)' style={{ animation: 'particle-float 8s ease-in-out infinite' }}/>
      <circle cx='198' cy='80' r='1' fill='rgba(0,229,255,0.08)' style={{ animation: 'particle-float 7s ease-in-out infinite 2s' }}/>
      <circle cx='72' cy='145' r='1' fill='rgba(0,229,255,0.06)' style={{ animation: 'particle-float 9s ease-in-out infinite 4s' }}/>
      <circle cx='228' cy='150' r='1' fill='rgba(0,229,255,0.06)' style={{ animation: 'particle-float 8.5s ease-in-out infinite 1s' }}/>
      <g style={{ transformOrigin: '125px 147px', transform: eSY, transition: 'transform 0.2s ease-out' }}>
        <path d='M 100 147 Q 125 128 150 147 Q 125 157 100 147' fill='none' stroke='rgba(0,229,255,0.4)' strokeWidth='0.9' filter='url(#jgl)'/>
        <circle cx='125' cy='146' r='11' fill='rgba(0,229,255,0.05)' stroke='rgba(0,229,255,0.18)' strokeWidth='0.5' style={{ transformOrigin: '125px 146px', transform: iScale, transition: 'transform 0.35s ease-out' }}/>
        <g style={{ transformOrigin: '125px 146px', animation: pAnimL }}>
          <circle cx='125' cy='146' r='4.5' fill='url(#jeg)'/>
          <circle cx='123' cy='144' r='1.4' fill='rgba(255,255,255,0.65)'/>
        </g>
      </g>
      <g style={{ transformOrigin: '175px 147px', transform: eSY, transition: 'transform 0.2s ease-out' }}>
        <path d='M 150 147 Q 175 128 200 147 Q 175 157 150 147' fill='none' stroke='rgba(0,229,255,0.4)' strokeWidth='0.9' filter='url(#jgl)'/>
        <circle cx='175' cy='146' r='11' fill='rgba(0,229,255,0.05)' stroke='rgba(0,229,255,0.18)' strokeWidth='0.5' style={{ transformOrigin: '175px 146px', transform: iScale, transition: 'transform 0.35s ease-out' }}/>
        <g style={{ transformOrigin: '175px 146px', animation: pAnimR }}>
          <circle cx='175' cy='146' r='4.5' fill='url(#jeg)'/>
          <circle cx='173' cy='144' r='1.4' fill='rgba(255,255,255,0.65)'/>
        </g>
      </g>
      <line x1='150' y1='155' x2='150' y2='174' stroke='rgba(0,229,255,0.07)' strokeWidth='0.5'/>
      {sp ? (
        <g>
          {[0,1,2,3,4,5,6].map(i => (
            <rect key={i} x={116+i*10} y={183} width='4' rx='2' height='12' fill='rgba(0,229,255,0.4)' style={{ transformOrigin: `${118+i*10}px 195px`, animation: `mouth-wave 0.45s ease-in-out infinite ${i*0.06}s`, '--mh': `${1.0+((i*3+2)%5)*0.4}` }}/>
          ))}
        </g>
      ) : (
        <path d={li ? 'M 130 186 Q 150 194 170 186' : th ? 'M 133 187 L 167 187' : 'M 125 185 Q 150 196 175 185'} fill='none' stroke={li ? 'rgba(0,229,255,0.22)' : 'rgba(0,229,255,0.13)'} strokeWidth={li ? '1.2' : '0.7'} style={{ transition: 'all 0.3s ease-out' }}/>
      )}
      {th && <path d='M 98 92 A 58 58 0 0 1 202 92' fill='none' stroke='rgba(0,229,255,0.18)' strokeWidth='0.8' strokeDasharray='160 160' style={{ animation: 'scan-sweep 2.5s linear infinite' }}/>}
      {li && <><circle cx='150' cy='150' r='93' fill='none' stroke='rgba(0,229,255,0.05)' strokeWidth='6' style={{ animation: 'listen-ring-p 1.5s ease-in-out infinite', transformOrigin: '150px 150px' }}/><circle cx='150' cy='150' r='93' fill='none' stroke='rgba(0,229,255,0.03)' strokeWidth='3' style={{ animation: 'listen-ring-p 1.5s ease-in-out infinite .25s', transformOrigin: '150px 150px' }}/></>}
    </svg>
  )
}