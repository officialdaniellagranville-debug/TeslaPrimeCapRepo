interface AnimatedDividerProps {
  variant?: 'wave' | 'curved' | 'angled';
  color?: string;
}

const paths: Record<string, string> = {
  wave: 'M0,30 C150,60 350,0 500,30 C650,60 850,0 1000,30 L1000,60 L0,60 Z',
  curved: 'M0,30 Q500,70 1000,30 L1000,60 L0,60 Z',
  angled: 'M0,50 L1000,10 L1000,60 L0,60 Z',
};

export default function AnimatedDivider({
  variant = 'wave',
  color = 'currentColor',
}: AnimatedDividerProps) {
  return (
    <div className="wave-divider w-full" role="separator" aria-hidden="true">
      <svg
        viewBox="0 0 1000 60"
        preserveAspectRatio="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        <path d={paths[variant]} fill={color} />
      </svg>
    </div>
  );
}
