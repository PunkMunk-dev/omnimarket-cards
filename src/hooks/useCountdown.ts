import { useState, useEffect } from 'react';

interface CountdownResult {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isEnded: boolean;
  isUrgent: boolean;   // < 15 minutes
  isWarning: boolean;  // 15–60 minutes
  totalSeconds: number;
}

function calcCountdown(endDate: string): CountdownResult {
  const diff = Math.max(0, Math.floor((new Date(endDate).getTime() - Date.now()) / 1000));
  const days = Math.floor(diff / 86400);
  const hours = Math.floor((diff % 86400) / 3600);
  const minutes = Math.floor((diff % 3600) / 60);
  const seconds = diff % 60;
  return {
    days,
    hours,
    minutes,
    seconds,
    isEnded: diff === 0,
    isUrgent: diff > 0 && diff < 15 * 60,
    isWarning: diff >= 15 * 60 && diff < 60 * 60,
    totalSeconds: diff,
  };
}

export function useCountdown(endDate: string | undefined): CountdownResult | null {
  const [result, setResult] = useState<CountdownResult | null>(
    endDate ? calcCountdown(endDate) : null
  );

  useEffect(() => {
    if (!endDate) return;

    setResult(calcCountdown(endDate));

    const id = setInterval(() => {
      const next = calcCountdown(endDate);
      setResult(next);
      if (next.isEnded) clearInterval(id);
    }, 1000);

    return () => clearInterval(id);
  }, [endDate]);

  return result;
}
