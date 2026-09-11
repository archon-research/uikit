import { useInsertionEffect, useRef, type RefObject } from 'react';

/**
 * A ref that always holds the most recent `value`, written during commit.
 *
 * For inputs an effect must *read* without *re-running* on. An inline callback
 * or accessor prop gets a fresh identity on every render of the parent, so
 * naming it in a dependency array re-fires the effect every render — which here
 * would mean re-registering a series with visx, or re-emitting a zoom domain,
 * in a loop with the state update that caused the render. Assigning
 * `ref.current` during render is the usual shortcut and is precisely what the
 * React Compiler rejects, so the write lives in an effect.
 *
 * That effect is `useInsertionEffect` — the standard `useEvent`-polyfill
 * technique — rather than `useEffect`, because React runs every insertion
 * effect in the tree during the mutation phase, before any layout effect and
 * long before any passive effect. The value a reader sees is therefore the one
 * from the render being committed no matter where the reader sits: in a layout
 * effect, in a child, or in a passive effect declared above this call. A
 * `useEffect` write is only current for passive readers declared below it, and
 * that ordering is not something a type or a lint rule can hold up.
 *
 * One consequence worth knowing, pinned in the spec: a cleanup running for the
 * *outgoing* commit sees the *incoming* value, because the write has already
 * happened by the time passive destroys run. Cleanups should use what their own
 * closure captured — `candlestick.tsx` unregisters the keys it captured, which
 * is the shape to copy.
 *
 * `useRef`'s initial value covers the first render; React does not run
 * insertion effects on the server, and nothing reads the ref during render.
 *
 * React 19.2's `useEffectEvent` replaces this hook outright, but the peer range
 * here is `react@^19.0.0`, which a consumer can satisfy with 19.0 or 19.1 -
 * neither of which has it. Revisit when the floor moves.
 */
export function useLatest<T>(value: T): RefObject<T> {
  const ref = useRef(value);
  useInsertionEffect(() => {
    ref.current = value;
  });
  return ref;
}
