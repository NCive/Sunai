import { useState, useEffect } from 'react';

export function useReducedMotion() {
  const [reducedMotion, setReducedMotion] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    const stored = localStorage.getItem('sunai_reduced_motion');
    if (stored !== null) return stored === 'true';
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  });

  useEffect(() => {
    const root = document.documentElement;
    if (reducedMotion) {
      root.classList.add('reduced-motion');
      localStorage.setItem('sunai_reduced_motion', 'true');
    } else {
      root.classList.remove('reduced-motion');
      localStorage.setItem('sunai_reduced_motion', 'false');
    }
  }, [reducedMotion]);

  const toggleReducedMotion = () => {
    setReducedMotion((prev) => !prev);
  };

  return { reducedMotion, toggleReducedMotion };
}

