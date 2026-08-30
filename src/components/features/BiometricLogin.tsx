'use client'

import { useState, useEffect } from 'react'
import { Fingerprint, ScanFace, CheckCircle } from 'lucide-react'

type ScanState = 'idle' | 'scanning' | 'verified'

export default function BiometricLogin() {
  const [scanState, setScanState] = useState<ScanState>('idle')

  useEffect(() => {
    const t1 = setTimeout(() => setScanState('scanning'), 500)
    const t2 = setTimeout(() => setScanState('verified'), 2500)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
    }
  }, [])

  const statusText: Record<ScanState, string> = {
    idle: 'Place your finger on the scanner',
    scanning: 'Scanning...',
    verified: 'Verified!',
  }

  const statusColor: Record<ScanState, string> = {
    idle: 'text-muted-foreground',
    scanning: 'text-amber-500',
    verified: 'text-emerald-500',
  }

  return (
    <div className="flex flex-col items-center justify-center mx-auto max-w-xs">
      <div className="rounded-2xl border border-border/50 bg-card/60 backdrop-blur-lg p-8 shadow-xl w-full flex flex-col items-center">
        <div className="relative w-28 h-28 mb-6">
          <div className={`absolute inset-0 rounded-full border-2 transition-colors duration-500 ${scanState === 'verified' ? 'border-emerald-500' : scanState === 'scanning' ? 'border-amber-500' : 'border-border'}`}>
            <div className="absolute inset-2 rounded-full bg-muted/50 flex items-center justify-center">
              {scanState === 'verified' ? (
                <CheckCircle className="w-10 h-10 text-emerald-500" />
              ) : (
                <Fingerprint className={`w-10 h-10 transition-colors duration-500 ${scanState === 'scanning' ? 'text-amber-500' : 'text-muted-foreground'}`} />
              )}
            </div>
          </div>
          {scanState === 'scanning' && (
            <div className="absolute inset-0 rounded-full overflow-hidden">
              <div className="fingerprint-scan absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-emerald-400 to-transparent" />
            </div>
          )}
        </div>
        <p className={`text-sm font-semibold transition-colors duration-300 ${statusColor[scanState]}`}>
          {statusText[scanState]}
        </p>

        <div className="w-full border-t border-border/50 my-5" />

        <button className="flex items-center gap-3 w-full px-4 py-3 rounded-xl border border-border/50 hover:bg-muted/50 transition-colors group">
          <div className="w-10 h-10 rounded-full bg-muted flex items-center justify-center group-hover:bg-primary/10 transition-colors">
            <ScanFace className="w-5 h-5 text-muted-foreground group-hover:text-primary transition-colors" />
          </div>
          <div className="text-left">
            <p className="text-sm font-medium text-foreground">Face ID</p>
            <p className="text-xs text-muted-foreground">Use face recognition instead</p>
          </div>
        </button>
      </div>

      <style jsx>{`
        .fingerprint-scan {
          animation: scanLine 2s ease-in-out infinite;
        }
        @keyframes scanLine {
          0% { top: 10%; }
          50% { top: 85%; }
          100% { top: 10%; }
        }
      `}</style>
    </div>
  )
}
