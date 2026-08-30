'use client'

import { useEffect } from 'react'

export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return

    // Unregister ALL old service workers first to clear stale caches
    navigator.serviceWorker.getRegistrations().then(regs => {
      for (const reg of regs) {
        reg.unregister().catch(() => {})
      }
      // After clearing, register the fresh one
      navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then(reg => {
        // Force check for updates immediately
        reg.update()
        // Listen for future updates and auto-reload
        reg.addEventListener('updatefound', () => {
          const newWorker = reg.installing
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'activated') {
                window.location.reload()
              }
            })
          }
        })
      }).catch(() => {})
    })
  }, [])

  return null
}
