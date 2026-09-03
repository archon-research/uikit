import { useEffect, useRef, type RefObject } from 'react';

/**
 * A ref that always holds the most recent `value`, written after commit.
 *
 * For inputs an effect must *read* without *re-running* on. An inline callback
 * or accessor prop gets a fresh identity on every render of the parent, so
 * naming it in a dependency array re-fires the effect every render — which here
 * would mean re-registering a series with visx, or re-emitting a zoom domain,
 * in a loop with the state update that caused the render. Assigning
 * `ref.current` during render is the usual shortcut and is precisely what the
 * React Compiler rejects, so the write lives in an effect with no dependency
 * array (it runs after every commit). Call this above the effects that read the
 * ref: effects run in declaration order, so the value they see is the one from
 * the render being committed. `useRef`'s initial value covers the first commit.
 */
export function useLatest<T>(value: T): RefObject<T> {
  const ref = useRef(value);
  useEffect(() => {
    ref.current = value;
  });
  return ref;
}
