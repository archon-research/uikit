import { cleanup, render } from '@testing-library/react';
import { StrictMode, useEffect, useRef, type RefObject } from 'react';
import { afterEach, describe, expect, it } from 'vitest';

import { useLatest } from './use-latest.js';

/**
 * `useLatest` exists for one shape, used identically in `candlestick.tsx` and
 * `zoom.tsx`: an effect that must *read* an input without *re-running* on it.
 *
 * Both call sites bundle inputs whose identity churns every render - inline
 * accessors (`xAccessor={(d) => d.index}`), or a `fullScale` derived from the
 * domain the effect itself emits - and both then fire on a deliberately narrow
 * trigger: `dataKey`/`data` for the series registration, the zoom transform for
 * the domain emit. Listing the churning inputs would re-register a series with
 * visx, or re-emit a zoom domain, on every render, each one causing the render
 * that fires it again.
 *
 * So the contract has two halves, and both are load-bearing at the call sites:
 *
 *   1. The ref *object* is stable, because both call sites put it in their
 *      dependency array (`accessorsRef`, `emitRef`). A fresh ref per render
 *      would re-fire those effects every render - the exact loop the ref was
 *      introduced to break.
 *   2. `ref.current` is current *in the same commit* the trigger fires in. The
 *      write is an effect with no dependency array, so it only beats the reader
 *      by being declared first; effects run in declaration order. This is what
 *      the doc comment's "call this above the effects that read the ref" buys,
 *      and `ReaderDeclaredBeforeWriter` below is the control that shows the
 *      cost of getting it backwards.
 *
 * Freshness matters because trigger and input routinely change in the *same*
 * commit: a resize that moves `width` while the zoom transform also moves, or a
 * `data` swap that arrives with new accessors. A stale read there registers the
 * wrong `yAccessor` into visx's registry, or emits a domain computed against
 * the previous width.
 *
 * One asymmetry falls out of that and is pinned below because it is easy to
 * assume the other way round: a *cleanup* reads the value from the commit it
 * was created in, not the one replacing it. React drains every destroy before
 * running any create, so the write effect for the new commit has not run yet.
 * `candlestick.tsx` is already right about this - it unregisters the keys its
 * own closure captured - but a future call site that reached for `ref.current`
 * in a cleanup expecting the incoming value would be reading the outgoing one.
 * That assertion is also what separates this from a `useLayoutEffect` write,
 * which lands early enough to change what the outgoing cleanup sees.
 */

afterEach(() => {
  cleanup();
});

type Input = { label: string };

/**
 * The call-site shape: `useLatest` above, the reading effect below, the ref in
 * the dependency array, and a cleanup - `candlestick.tsx` unregisters its
 * synthetic series on the way out, so the reader is re-entered on a StrictMode
 * remount.
 */
function CallSiteShape({
  trigger,
  input,
  onRun,
  onCleanup,
}: {
  trigger: number;
  input: Input;
  onRun: (entry: string) => void;
  onCleanup: (trigger: number, ref: RefObject<Input>) => void;
}) {
  const inputRef = useLatest(input);

  useEffect(() => {
    onRun(`run:${trigger}:${inputRef.current.label}`);
    // The cleanup hands the ref back instead of reading `.current` inside the
    // closure. The read still happens synchronously within this cleanup, so the
    // instant observed is identical - but `react-hooks/exhaustive-deps` warns
    // on `.current` in a cleanup, and its warning is precisely the timing
    // question this file exists to answer. Better to leave that rule speaking
    // than to suppress it in the one place its subject matter is the point.
    return () => onCleanup(trigger, inputRef);
  }, [trigger, inputRef, onRun, onCleanup]);

  return null;
}

/**
 * The same shape with `useLatest` inlined and split so its write effect is
 * declared *after* the reader. Not a supported use - it is here to show that
 * the declaration order in the doc comment is a real constraint and not a
 * stylistic preference. It deliberately does not call `useLatest`, so it
 * characterises React's effect ordering rather than this hook.
 */
function ReaderDeclaredBeforeWriter({
  trigger,
  input,
  onRun,
}: {
  trigger: number;
  input: Input;
  onRun: (entry: string) => void;
}) {
  const inputRef = useRef(input);

  useEffect(() => {
    onRun(`run:${trigger}:${inputRef.current.label}`);
  }, [trigger, inputRef, onRun]);

  useEffect(() => {
    inputRef.current = input;
  });

  return null;
}

/** Stable callbacks so identity churn never comes from the harness itself. */
function recorder(log: string[]) {
  return {
    onRun: (entry: string) => log.push(entry),
    onCleanup: (trigger: number, ref: RefObject<Input>) =>
      log.push(`cleanup:${trigger}:${ref.current.label}`),
  };
}

describe('useLatest', () => {
  it('hands the reader the value from the commit it fires in', () => {
    const log: string[] = [];
    const { onRun, onCleanup } = recorder(log);
    const { rerender } = render(
      <CallSiteShape
        trigger={1}
        input={{ label: 'a' }}
        onRun={onRun}
        onCleanup={onCleanup}
      />,
    );
    expect(log).toEqual(['run:1:a']);

    // Trigger and input move together, the case a stale read gets wrong. The
    // cleanup is entered before any of the new commit's effects, so it still
    // reads `a` - see the note on ordering above.
    rerender(
      <CallSiteShape
        trigger={2}
        input={{ label: 'b' }}
        onRun={onRun}
        onCleanup={onCleanup}
      />,
    );
    expect(log).toEqual(['run:1:a', 'cleanup:1:a', 'run:2:b']);
  });

  it('leaves the reader a commit behind when declared after it', () => {
    const log: string[] = [];
    const onRun = (entry: string) => log.push(entry);
    const { rerender } = render(
      <ReaderDeclaredBeforeWriter
        trigger={1}
        input={{ label: 'a' }}
        onRun={onRun}
      />,
    );
    rerender(
      <ReaderDeclaredBeforeWriter
        trigger={2}
        input={{ label: 'b' }}
        onRun={onRun}
      />,
    );

    // `b` is what this render supplied; the reader saw `a`.
    expect(log).toEqual(['run:1:a', 'run:2:a']);
  });

  it('does not re-fire a reader that depends on the ref', () => {
    const log: string[] = [];
    const { onRun, onCleanup } = recorder(log);
    const { rerender } = render(
      <CallSiteShape
        trigger={1}
        input={{ label: 'a' }}
        onRun={onRun}
        onCleanup={onCleanup}
      />,
    );

    // Five renders, a fresh input object each time, trigger unchanged: exactly
    // the churn an inline accessor produces. The reader must sit still.
    for (const label of ['b', 'c', 'd', 'e', 'f']) {
      rerender(
        <CallSiteShape
          trigger={1}
          input={{ label }}
          onRun={onRun}
          onCleanup={onCleanup}
        />,
      );
    }

    expect(log).toEqual(['run:1:a']);
  });

  it('is current on both halves of a StrictMode double-invoked mount', () => {
    const log: string[] = [];
    const { onRun, onCleanup } = recorder(log);
    render(
      <StrictMode>
        <CallSiteShape
          trigger={1}
          input={{ label: 'a' }}
          onRun={onRun}
          onCleanup={onCleanup}
        />
      </StrictMode>,
    );

    // Mount, simulated unmount, remount. The remounted reader re-registers, so
    // what it reads has to still be the mounted value.
    //
    // Honest scope: this is a characterisation guard, not a discriminator. It
    // was checked against six wrong implementations of `useLatest` - a
    // render-phase write, a mount-only effect, a write in the cleanup, a fresh
    // ref per render, a layout-effect write, and a cleanup that clears the ref -
    // and caught only the last, which the freshness test above already catches.
    // Double-invocation turns out to be orthogonal to this contract, which is
    // about declaration order and ref stability. It stays because it is cheap
    // and pins that the hook is idempotent under it; do not read a pass here as
    // evidence on its own.
    expect(log).toEqual(['run:1:a', 'cleanup:1:a', 'run:1:a']);
  });
});
