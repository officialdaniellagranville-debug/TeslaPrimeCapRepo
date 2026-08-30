'use client';

import { Badge } from '@/components/ui/badge';

const RATES = [
  {
    product: 'HIGH YIELD SAVINGS',
    rate: '4.25% APY*',
    badge: 'FEATURED',
    label: 'Savings',
    featured: true,
  },
  {
    product: '18-MONTH CERTIFICATE',
    rate: '4.10% APY*',
    badge: null,
    label: 'Certificate',
    featured: false,
  },
  {
    product: 'CREDIT CARDS',
    rate: '3.99% APR*',
    badge: null,
    label: 'Credit',
    featured: false,
  },
  {
    product: 'PERSONAL LOANS',
    rate: '12.49% APR*',
    badge: null,
    label: 'Mortgage',
    featured: false,
  },
] as const;

export default function RatesSection() {
  return (
    <section className="relative py-20 sm:py-28">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-14">
          <h2 className="text-3xl sm:text-4xl lg:text-5xl font-bold font-[family-name:var(--font-dm-sans)] tracking-tight">
            CoreWealth Rates
          </h2>
          <p className="mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto">
            Discover competitive rates designed to help your money grow faster
          </p>
        </div>

        {/* Member Rates Heading */}
        <h3 className="text-sm font-semibold uppercase tracking-widest text-muted-foreground mb-6">
          Member Rates
        </h3>

        {/* Rate Cards Grid */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
          {RATES.map(({ product, rate, badge, label, featured }) => (
            <div
              key={product}
              className={`premium-card card-shine p-5 sm:p-6 flex flex-col items-center text-center gap-4 ${
                featured ? 'glow-purple' : ''
              }`}
            >
              {badge && (
                <Badge className="bg-primary/15 text-primary border-primary/25 text-[10px] sm:text-xs font-semibold uppercase tracking-wider hover:bg-primary/20">
                  {badge}
                </Badge>
              )}
              <span className="text-4xl sm:text-4xl font-bold text-primary leading-none">
                {rate}
              </span>
              <span className="text-xs sm:text-sm font-semibold text-foreground/80 uppercase tracking-wide">
                {product}
              </span>
              <span className="text-xs text-muted-foreground">{label}</span>
            </div>
          ))}
        </div>

        {/* Footer Note */}
        <p className="mt-8 text-center text-xs text-muted-foreground">
          *Annual Percentage Yield. Rates subject to change. Terms and conditions apply.
        </p>
      </div>
    </section>
  );
}
