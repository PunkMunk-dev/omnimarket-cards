interface PokeballIconProps {
  className?: string;
}

export function PokeballIcon({ className }: PokeballIconProps) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} xmlns="http://www.w3.org/2000/svg">
      <path d="M12 2C6.48 2 2 6.48 2 12h6.5c0-1.93 1.57-3.5 3.5-3.5s3.5 1.57 3.5 3.5H22c0-5.52-4.48-10-10-10z" fill="currentColor" />
      <path d="M12 22c5.52 0 10-4.48 10-10h-6.5c0 1.93-1.57 3.5-3.5 3.5s-3.5-1.57-3.5-3.5H2c0 5.52 4.48 10 10 10z" fill="currentColor" opacity="0.4" />
      <line x1="2" y1="12" x2="22" y2="12" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="2.5" fill="none" stroke="currentColor" strokeWidth="1.5" />
      <circle cx="12" cy="12" r="1" fill="currentColor" />
    </svg>
  );
}
