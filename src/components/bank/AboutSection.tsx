'use client';

import { useState, useEffect, useRef } from 'react';
import { Building2, MapPin, Users, DollarSign } from 'lucide-react';

const stats = [
  {
    icon: Building2,
    label: 'Founded',
    value: '2018',
  },
  {
    icon: MapPin,
    label: 'Branches',
    value: '50+',
  },
  {
    icon: Users,
    label: 'Members',
    value: '150K+',
  },
  {
    icon: DollarSign,
    label: 'Assets',
    value: '$2.5B+',
  },
];

export default function AboutSection() {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.15 }
    );

    const current = ref.current;
    if (current) observer.observe(current);
    return () => {
      if (current) observer.unobserve(current);
    };
  }, []);

  return (
    <section ref={ref} className="py-20 px-4 sm:px-6 lg:px-8">
      <div
        className={`max-w-7xl mx-auto transition-all duration-700 ${
          isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
        }`}
      >
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl sm:text-4xl font-bold text-gray-900 dark:text-white mb-2">
              About <span className="text-emerald-500">VaultEdge</span> Bank
            </h2>
            <div className="w-16 h-1 bg-emerald-500 rounded-full mb-6" />
            <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed">
              Founded in 2018, VaultEdge Bank is on a mission to redefine modern banking with
              transparency, innovation, and customer-first values. We combine cutting-edge digital
              technology with the personal touch of a neighborhood bank, empowering individuals and
              businesses to achieve their financial goals with confidence.
            </p>
            <p className="text-gray-600 dark:text-gray-400 text-lg leading-relaxed mt-4">
              Our commitment to security, accessibility, and sustainable growth makes us the trusted
              financial partner for over 150,000 members worldwide. Whether you&apos;re saving for the
              future, growing your business, or managing daily finances, VaultEdge is built for you.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            {stats.map((stat) => {
              const Icon = stat.icon;
              return (
                <div
                  key={stat.label}
                  className="border border-gray-200 dark:border-white/10 rounded-xl p-4 bg-white dark:bg-[#111827] hover:border-emerald-500/50 transition-colors"
                >
                  <Icon className="w-6 h-6 text-emerald-500 mb-3" />
                  <p className="text-sm text-gray-500 dark:text-gray-400">{stat.label}</p>
                  <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                    {stat.value}
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </section>
  );
}
