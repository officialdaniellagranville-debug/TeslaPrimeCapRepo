'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

/* ══════════════════════════════════════════════════════════════════
   VIDEO TESTIMONIALS SECTION — Premium video testimonial cards
   ══════════════════════════════════════════════════════════════════ */

interface TestimonialData {
  name: string;
  title: string;
  location: string;
  initials: string;
  quote: string;
  stars: number;
}

const testimonials: TestimonialData[] = [
  {
    name: 'Sarah Mitchell',
    title: 'CEO, Mitchell Ventures',
    location: 'New York, USA',
    initials: 'SM',
    quote:
      'CoreWealth transformed how we manage our corporate finances. The international transfer capabilities saved us thousands in fees.',
    stars: 5,
  },
  {
    name: 'James Chen',
    title: 'Software Engineer',
    location: 'San Francisco, USA',
    initials: 'JC',
    quote:
      "The crypto integration is seamless. I can manage my traditional banking and digital assets all in one place. The 3D globe on the homepage is gorgeous.",
    stars: 5,
  },
  {
    name: 'Amara Okafor',
    title: 'Business Owner',
    location: 'London, UK',
    initials: 'AO',
    quote:
      'Opening my account took less than 3 minutes with the selfie verification. The mobile app is incredibly smooth and the blue design is stunning.',
    stars: 5,
  },
];

const decoClients = [
  { initials: 'MK', name: 'Michael K.' },
  { initials: 'LP', name: 'Laura P.' },
  { initials: 'RJ', name: 'Raj J.' },
  { initials: 'ES', name: 'Elena S.' },
];

/* ── Star Rating ── */
function StarRating({ count }: { count: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: 5 }).map((_, i) => (
        <svg
          key={i}
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill={i < count ? '#FBBF24' : 'none'}
          stroke={i < count ? '#FBBF24' : '#4B5563'}
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={i < count ? { filter: 'drop-shadow(0 0 3px rgba(251,191,36,0.4))' } : undefined}
        >
          <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
        </svg>
      ))}
    </div>
  );
}

/* ── Waveform Bars Animation ── */
function WaveformBars() {
  return (
    <div className="flex items-end justify-center gap-[3px] h-12">
      {[0, 1, 2, 3, 4, 5, 6, 7].map((i) => (
        <div
          key={i}
          className="w-[3px] rounded-full bg-[#2563EB]"
          style={{
            height: `${20 + Math.random() * 80}%`,
            animation: `vidWaveform 0.8s ease-in-out ${i * 0.1}s infinite alternate`,
          }}
        />
      ))}
    </div>
  );
}

/* ── Single Video Card ── */
function VideoCard({ data, index }: { data: TestimonialData; index: number }) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [visible, setVisible] = useState(false);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = cardRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => setVisible(true), index * 150);
          obs.unobserve(el);
        }
      },
      { threshold: 0.15 }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [index]);

  return (
    <div
      ref={cardRef}
      className={`
        bg-white/[0.03] border border-white/5 rounded-2xl overflow-hidden
        transition-all duration-300
        ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'}
        hover:-translate-y-1 hover:border-[#2563EB]/40 hover:shadow-[0_8px_32px_rgba(37,99,235,0.12)]
      `}
    >
      {/* Video Player Area */}
      <div
        className="relative bg-gradient-to-br from-[#0A0E1A] to-[#111827] aspect-video cursor-pointer group overflow-hidden"
        onClick={() => setIsPlaying(!isPlaying)}
      >
        {/* Subtle grid pattern */}
        <div
          className="absolute inset-0 opacity-[0.04]"
          style={{
            backgroundImage:
              'linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)',
            backgroundSize: '24px 24px',
          }}
        />

        {/* Blue glow orb */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-[#2563EB]/20 rounded-full blur-3xl pointer-events-none" />

        {isPlaying ? (
          <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
            <WaveformBars />
            <span className="text-white/50 text-xs font-medium tracking-wider uppercase">
              Playing &mdash; {data.name}
            </span>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-16 h-16 rounded-full bg-[#2563EB] flex items-center justify-center shadow-lg shadow-[#2563EB]/30 group-hover:scale-110 transition-transform duration-200">
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                fill="white"
              >
                <polygon points="8,5 20,12 8,19" />
              </svg>
            </div>
          </div>
        )}

        {/* Duration badge */}
        <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-sm text-white text-[10px] font-mono px-2 py-0.5 rounded-md">
          2:{String(14 + index * 7).padStart(2, '0')}
        </div>
      </div>

      {/* Info Area */}
      <div className="p-5">
        <div className="flex items-start gap-3 mb-3">
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#2563EB] to-[#1E3A8A] flex items-center justify-center text-white text-xs font-bold shrink-0">
            {data.initials}
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-semibold truncate">{data.name}</p>
            <p className="text-white/40 text-xs truncate">{data.title}</p>
          </div>
        </div>

        <StarRating count={data.stars} />

        <p className="text-white/60 text-sm leading-relaxed mt-3">
          &ldquo;{data.quote}&rdquo;
        </p>

        <p className="text-white/30 text-xs mt-3 flex items-center gap-1">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          {data.location}
        </p>
      </div>
    </div>
  );
}

/* ── Main Section ── */
export default function VideoTestimonialsSection() {
  const [headingVisible, setHeadingVisible] = useState(false);
  const headingRef = useRef<HTMLDivElement>(null);

  const handleHeadingObs = useCallback(([entry]: IntersectionObserverEntry[]) => {
    if (entry.isIntersecting) {
      setHeadingVisible(true);
    }
  }, []);

  useEffect(() => {
    const el = headingRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(handleHeadingObs, { threshold: 0.2 });
    obs.observe(el);
    return () => obs.disconnect();
  }, [handleHeadingObs]);

  return (
    <section className="py-20 px-4 relative">
      {/* Background accent */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[600px] bg-[#2563EB]/[0.03] rounded-full blur-3xl pointer-events-none" />

      <div className="max-w-6xl mx-auto relative z-10">
        {/* Heading */}
        <div
          ref={headingRef}
          className={`text-center mb-14 transition-all duration-700 ${headingVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'}`}
        >
          <p className="text-[#2563EB] text-sm font-semibold tracking-wider uppercase mb-3">
            Video Testimonials
          </p>
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-4">
            What Our Clients Say
          </h2>
          <p className="text-white/50 max-w-xl mx-auto text-sm leading-relaxed">
            Hear directly from the people who trust CoreWealth with their
            financial future.
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, i) => (
            <VideoCard key={t.name} data={t} index={i} />
          ))}
        </div>

        {/* Decorative Clients Row */}
        <div className="mt-16 text-center">
          <div className="flex items-center justify-center gap-4 mb-4">
            {decoClients.map((c, i) => (
              <div key={i} className="flex flex-col items-center gap-1.5">
                <div className="w-10 h-10 rounded-full bg-white/[0.06] border border-white/10 flex items-center justify-center text-white/50 text-[10px] font-bold">
                  {c.initials}
                </div>
                <span className="text-white/30 text-[10px] hidden sm:block">{c.name}</span>
              </div>
            ))}
          </div>
          <p className="text-white/40 text-sm">
            Join{' '}
            <span className="text-white font-semibold">150,000+</span>{' '}
            satisfied clients worldwide
          </p>
        </div>
      </div>

      {/* Waveform keyframes */}
      <style dangerouslySetInnerHTML={{ __html: `
        @keyframes vidWaveform {
          0% { height: 20%; }
          100% { height: 100%; }
        }
      ` }} />
    </section>
  );
}
