import { useCallback, useEffect, useState } from 'react';

/** The current hash route, parsed from `location.hash`. */
export type HashRoute = {
  /** The hash with a leading `#` (and an optional leading `/`) stripped. */
  hash: string;
  /** The first `/`-separated segment (the top-level view), or `''`. */
  path: string;
  /** All non-empty `/`-separated segments (`#/risk/detail` → `['risk','detail']`). */
  segments: string[];
};

function parseHash(): HashRoute {
  const raw =
    typeof window === 'undefined'
      ? ''
      : window.location.hash.replace(/^#\/?/, '');
  const segments = raw.split('/').filter(Boolean);
  return { hash: raw, path: segments[0] ?? '', segments };
}

/**
 * Deeplinkable hash routing without a router dependency: returns the parsed
 * current {@link HashRoute} and a `navigate(to)` writer, staying in sync with
 * `hashchange`. SSR-safe (returns an empty route until mounted). Consumers layer
 * their own view map / alias table on top of `path`/`segments`.
 *
 * ```ts
 * const [route, navigate] = useHashRoute();
 * // route.path === 'risk' for '#/risk/detail'; navigate('risk/detail')
 * ```
 */
export function useHashRoute(): readonly [HashRoute, (to: string) => void] {
  const [route, setRoute] = useState<HashRoute>(parseHash);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const onChange = () => setRoute(parseHash());
    // Re-sync in case the hash changed between first render and this effect.
    onChange();
    window.addEventListener('hashchange', onChange);
    return () => window.removeEventListener('hashchange', onChange);
  }, []);

  const navigate = useCallback((to: string) => {
    if (typeof window === 'undefined') return;
    window.location.hash = to.replace(/^#/, '');
  }, []);

  return [route, navigate] as const;
}
