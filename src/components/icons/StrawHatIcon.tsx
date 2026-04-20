interface StrawHatIconProps {
  className?: string;
}

export function StrawHatIcon({ className }: StrawHatIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="12" cy="16" rx="10" ry="3" fill="currentColor" opacity="0.4" />
      <path d="M5 16c0-4.5 3.13-8 7-8s7 3.5 7 8" fill="currentColor" />
      <path d="M5.5 14.5c0.5-0.3 3-1 6.5-1s6 0.7 6.5 1" stroke="currentColor" strokeWidth="2" strokeLinecap="round" opacity="0.7" />
      <path d="M8 10c0.5-1.5 2-3 4-3s3.5 1.5 4 3" stroke="currentColor" strokeWidth="0.5" opacity="0.3" />
    </svg>
  );
}
