'use client'

import { ReactNode } from 'react'

interface BentoGridProps {
  children: ReactNode
  className?: string
}

export default function BentoGrid({ children, className = '' }: BentoGridProps) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-3 auto-rows-[minmax(180px,auto)] gap-4 ${className}`}>
      {Array.isArray(children) ? (
        children.map((child, i) => (
          <div
            key={i}
            className={
              i === 0
                ? 'md:col-span-2 md:row-span-2'
                : ''
            }
          >
            {child}
          </div>
        ))
      ) : (
        <div className="md:col-span-2 md:row-span-2">{children}</div>
      )}
    </div>
  )
}