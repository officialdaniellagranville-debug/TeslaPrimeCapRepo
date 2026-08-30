'use client';

interface CoreWealthLogoProps {
  className?: string;
  variant?: 'full' | 'icon' | 'wordmark' | 'compact';
}

export default function CoreWealthLogo({ className = 'h-8', variant = 'full' }: CoreWealthLogoProps) {
  const primaryColor = '#2563EB';
  const secondaryColor = '#60A5FA';

  // Shield SVG path for CoreWealth
  const shieldPath = 'M12 2L3 7v5c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V7l-9-5z';
  const checkPath = 'M9 12l2 2 4-4';

  // Icon-only variant (square, 24x24)
  if (variant === 'icon') {
    return (
      <svg viewBox="0 0 24 24" className={className} xmlns="http://www.w3.org/2000/svg">
        <path d={shieldPath} fill={primaryColor}/>
        <path d={checkPath} fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
    );
  }

  // Compact variant: icon + "CW" text
  if (variant === 'compact') {
    return (
      <div className={`flex items-center gap-1.5 ${className}`}>
        <svg viewBox="0 0 24 24" className="h-full w-auto" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
          <path d={shieldPath} fill={primaryColor}/>
          <path d={checkPath} fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <span className="font-bold tracking-wider leading-none" style={{ color: primaryColor, fontFamily: 'Arial, Helvetica, sans-serif' }}>CW</span>
      </div>
    );
  }

  // Wordmark variant: icon + "CORE WEALTH" text
  if (variant === 'wordmark') {
    return (
      <div className={`flex items-center gap-2 ${className}`}>
        <svg viewBox="0 0 24 24" className="h-full w-auto max-h-full" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
          <path d={shieldPath} fill={primaryColor}/>
          <path d={checkPath} fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
        <div className="flex flex-col leading-none">
          <span className="font-black tracking-[0.15em]" style={{ color: primaryColor, fontFamily: 'Arial, Helvetica, sans-serif' }}>CORE</span>
          <span style={{ color: secondaryColor, fontFamily: 'Arial, Helvetica, sans-serif' }} className="font-semibold tracking-[0.12em] text-[0.65em] mt-0.5">WEALTH</span>
        </div>
      </div>
    );
  }

  // Default 'full': same as wordmark
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <svg viewBox="0 0 24 24" className="h-full w-auto max-h-full" xmlns="http://www.w3.org/2000/svg" style={{ flexShrink: 0 }}>
        <path d={shieldPath} fill={primaryColor}/>
        <path d={checkPath} fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      <div className="flex flex-col leading-none">
        <span className="font-black tracking-[0.15em]" style={{ color: primaryColor, fontFamily: 'Arial, Helvetica, sans-serif' }}>CORE</span>
        <span style={{ color: secondaryColor, fontFamily: 'Arial, Helvetica, sans-serif' }} className="font-semibold tracking-[0.12em] text-[0.65em] mt-0.5">WEALTH</span>
      </div>
    </div>
  );
}
