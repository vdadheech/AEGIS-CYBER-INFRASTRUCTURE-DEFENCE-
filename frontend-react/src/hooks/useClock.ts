import { useState, useEffect } from 'react';

export function useClock(): string {
  const [time, setTime] = useState(() => formatUTC(new Date()));

  useEffect(() => {
    const id = setInterval(() => setTime(formatUTC(new Date())), 1000);
    return () => clearInterval(id);
  }, []);

  return time;
}

function formatUTC(date: Date): string {
  return date.toUTCString().split(' ').slice(1, 5).join(' ') + ' UTC';
}
