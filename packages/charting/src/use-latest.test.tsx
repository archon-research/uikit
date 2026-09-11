import { cleanup, render } from '@testing-library/react';
import { StrictMode, useEffect, useLayoutEffect, type RefObject } from 'react';
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
 *      write is a `useInsertionEffect`, which React runs during the mutation
 *      phase - every one in the tree, before any layout effect and long before
 *      any passive effect. So freshness does not depend on where the reader is
 *      declared: the specs below pin a reader in a child component and a reader
 *      in a `useLayoutEffect`, both of which a `useEffect` write leaves a commit
 *      behind - checked by reverting the write to `useEffect`, which fails both
 *      of them.
 *
 * Freshness matters because trigger and input routinely change in the *same*
 * commit: a resize that moves `width` while the zoom transform also moves, or a
 * `data` swap that arrives with new accessors. A stale read there registers the
 * wrong `yAccessor` into visx's registry, or emits a domain computed against
 * the previous width.
 *
 * The price of writing that early is one asymmetry, pinned below because it is
 * easy to assume the other way round: a *cleanup* running for the outgoing
 * commit sees the *incoming* value. Passive destroys run after the commit that
 * replaced them, so the write is already done by the time they are entered.
 * `candlestick.tsx` is already right about this - it unregisters the keys its
 * own closure captured, not whatever `ref.current` says - and that is the shape
 * for any future cleanup to copy.
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
 * A reader in a child component, given the ref as a prop. Its effect is a
 * passive effect that React runs *before* the parent's, exactly like an effect
 * declared above the `useLatest` call in the same component - so under the
 * previous `useEffect` write this read the previous render's value, and the
 * doc comment's "call this above the effects that read the ref" could not reach
 * it at all. The insertion-effect write lands before every passive effect in
 * the tree, so the reader's position stops mattering.
 */
function ChildReader({
  trigger,
  inputRef,
  onRun,
}: {
  trigger: number;
  inputRef: RefObject<Input>;
  onRun: (entry: string) => void;
}) {
  useEffect(() => {
    onRun(`child:${trigger}:${inputRef.current.label}`);
  }, [trigger, inputRef, onRun]);

  return null;
}

function ParentWriter({
  trigger,
  input,
  onRun,
}: {
  trigger: number;
  input: Input;
  onRun: (entry: string) => void;
}) {
  const inputRef = useLatest(input);

  return <ChildReader trigger={trigger} inputRef={inputRef} onRun={onRun} />;
}

/**
 * A reader in the layout phase. Layout effects run after every insertion effect
 * in the tree but before any passive one, so this is the case a `useEffect`
 * write cannot serve at all, whatever the declaration order.
 */
function LayoutReader({
  trigger,
  input,
  onRun,
}: {
  trigger: number;
  input: Input;
  onRun: (entry: string) => void;
}) {
  const inputRef = useLatest(input);

  useLayoutEffect(() => {
    onRun(`layout:${trigger}:${inputRef.current.label}`);
  }, [trigger, inputRef, onRun]);

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
    // cleanup is entered after the new commit has already written the ref, so
    // it reads `b` - the asymmetry described above, not a stale read.
    rerender(
      <CallSiteShape
        trigger={2}
        input={{ label: 'b' }}
        onRun={onRun}
        onCleanup={onCleanup}
      />,
    );
    expect(log).toEqual(['run:1:a', 'cleanup:1:b', 'run:2:b']);
  });

  it("is current for a child's effect, which runs before the parent's", () => {
    const log: string[] = [];
    const onRun = (entry: string) => log.push(entry);
    const { rerender } = render(
      <ParentWriter trigger={1} input={{ label: 'a' }} onRun={onRun} />,
    );
    rerender(<ParentWriter trigger={2} input={{ label: 'b' }} onRun={onRun} />);

    // `b` is what this render supplied, and `b` is what the child saw. Under
    // the previous `useEffect` write this second entry read `a`.
    expect(log).toEqual(['child:1:a', 'child:2:b']);
  });

  it('is current for a reader in the layout phase', () => {
    const log: string[] = [];
    const onRun = (entry: string) => log.push(entry);
    const { rerender } = render(
      <LayoutReader trigger={1} input={{ label: 'a' }} onRun={onRun} />,
    );
    rerender(<LayoutReader trigger={2} input={{ label: 'b' }} onRun={onRun} />);

    expect(log).toEqual(['layout:1:a', 'layout:2:b']);
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
    // about ref stability and which commit phase the write lands in. It stays
    // because it is cheap and pins that the hook is idempotent under it; do not
    // read a pass here as evidence on its own.
    expect(log).toEqual(['run:1:a', 'cleanup:1:a', 'run:1:a']);
  });
});
