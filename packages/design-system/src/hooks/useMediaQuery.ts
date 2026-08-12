import { useEffect, useState } from 'react';

/**
 * Subscribe to a CSS media query, returning whether it currently matches.
 * SSR-safe (returns `false` until mounted) and includes the legacy
 * `addListener`/`removeListener` fallback that jsdom and older Safari need.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || !window.matchMedia) return;
    const media = window.matchMedia(query);
    const update = () => setMatches(media.matches);
    update();
    if (media.addEventListener) {
      media.addEventListener('change', update);
      return () => media.removeEventListener('change', update);
    }
    // Legacy Safari / jsdom.
    media.addListener(update);
    return () => media.removeListener(update);
  }, [query]);

  return matches;
}

/**
 * Whether the user has requested reduced motion. Thin wrapper over
 * {@link useMediaQuery} so components can honour `prefers-reduced-motion`
 * without re-deriving the query.
 */
export function usePrefersReducedMotion(): boolean {
  return useMediaQuery('(prefers-reduced-motion: reduce)');
}
