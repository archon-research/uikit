import {
  type HTMLAttributes,
  type ReactNode,
  useEffect,
  useRef,
  useState,
} from 'react';

import { usePrefersReducedMotion } from '../hooks/useMediaQuery.js';

/**
 * Class names emitted by the `flash` recipe (registered in the preset +
 * staticCss). The design-system ships no generated `styled-system`, so the
 * recipe is applied by its stable class names (`flash`, `flash--tone_x`).
 */
const cx = (...classes: Array<string | false | null | undefined>): string =>
  classes.filter(Boolean).join(' ');

export type FlashTone = 'positive' | 'critical' | 'neutral';
export type FlashDirection = 'up' | 'down' | 'none';

/** Discrete-marker lifetime under reduced motion: the kit's 400ms hold + 900ms fade. */
const REDUCED_MOTION_MARKER_MS = 1300;

/**
 * Direction of a numeric change. Non-numeric or equal values return `'none'`.
 * Exported for the pure-logic test.
 */
export function flashDirection(
  next: number | string | null | undefined,
  prev: number | string | null | undefined,
): FlashDirection {
  const a = typeof prev === 'number' ? prev : Number(prev);
  const b = typeof next === 'number' ? next : Number(next);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return 'none';
  if (b > a) return 'up';
  if (b < a) return 'down';
  return 'none';
}

const defaultToneFor = (direction: FlashDirection): FlashTone | null =>
  direction === 'up' ? 'positive' : direction === 'down' ? 'critical' : null;

export type UseValueFlashOptions<T> = {
  /**
   * Map a change to a tone. Defaults to numeric direction (up → positive,
   * down → critical, equal → no flash). Return `null` to suppress the flash.
   */
  toneFor?: (
    direction: FlashDirection,
    value: T,
    previous: T,
  ) => FlashTone | null;
  /**
   * Custom direction comparator, overriding the default numeric comparison.
   * Use for value types the default can't order meaningfully.
   */
  compare?: (next: T, previous: T) => FlashDirection;
  /**
   * Parse a value to a number before the default numeric comparison — e.g. to
   * compare fixed-scale decimal *strings* by magnitude so `"100.10" → "100.100"`
   * does not read as a change. Ignored when `compare` is provided.
   */
  parse?: (value: T) => number;
};

export type UseValueFlashResult = {
  tone: FlashTone | null;
  direction: FlashDirection;
  /** Increments on every flashing change — use as a React `key` to re-trigger the CSS animation. */
  flashId: number;
};

/**
 * Tracks a value and reports a `tone`/`direction`/`flashId` whenever it
 * changes, so any value (not just a `DataTable` cell) can flash on update.
 */
export function useValueFlash<T>(
  value: T,
  options: UseValueFlashOptions<T> = {},
): UseValueFlashResult {
  const previousRef = useRef<T>(value);
  const optionsRef = useRef(options);
  // Synced in an effect, not in the render body: a render-time ref write is a
  // React Compiler violation. Declared BEFORE the change effect below, so on
  // any commit that carries both a new `value` and new callbacks React runs
  // this one first and the change effect still reads the current options.
  useEffect(() => {
    optionsRef.current = options;
  });
  const [state, setState] = useState<UseValueFlashResult>({
    tone: null,
    direction: 'none',
    flashId: 0,
  });

  useEffect(() => {
    const previous = previousRef.current;
    if (Object.is(previous, value)) return;
    const { compare, parse, toneFor } = optionsRef.current;
    const direction = compare
      ? compare(value, previous)
      : parse
        ? flashDirection(parse(value), parse(previous))
        : flashDirection(
            value as unknown as number | string,
            previous as unknown as number | string,
          );
    const tone = toneFor
      ? toneFor(direction, value, previous)
      : defaultToneFor(direction);
    previousRef.current = value;
    if (tone != null) {
      setState((s) => ({ tone, direction, flashId: s.flashId + 1 }));
    }
  }, [value]);

  return state;
}

export type FlashOnChangeProps = Omit<
  HTMLAttributes<HTMLSpanElement>,
  'children'
> & {
  /** The value to watch (drives the flash) and, by default, to display. */
  value: number | string;
  /** Display content. Defaults to `value`. */
  children?: ReactNode;
  toneFor?: UseValueFlashOptions<number | string>['toneFor'];
  compare?: UseValueFlashOptions<number | string>['compare'];
  parse?: UseValueFlashOptions<number | string>['parse'];
  /** Announce changes via a visually-hidden `role="status"`. Defaults to true. */
  announce?: boolean;
};

const MARKER_GLYPH: Record<FlashDirection, string> = {
  up: '▲',
  down: '▼',
  none: '',
};

/**
 * Flashes a value when it changes: a two-phase background tint normally, and a
 * discrete marker under `prefers-reduced-motion`. Wraps `useValueFlash` +
 * the public `flash` recipe so `DataTable` and standalone figures share one
 * treatment.
 */
export function FlashOnChange({
  value,
  children,
  toneFor,
  compare,
  parse,
  announce = true,
  className,
  ...rest
}: FlashOnChangeProps) {
  const { tone, direction, flashId } = useValueFlash(value, {
    toneFor,
    compare,
    parse,
  });
  const reducedMotion = usePrefersReducedMotion();
  // The marker's visibility is DERIVED, not set from the effect: it is on for
  // any flash the hold timer has not yet retired, and the effect's only job is
  // to arm that timer. Written the other way round (`setMarkerVisible(true)`
  // in the effect body) it is a cascading-render violation, and it also cost a
  // second commit before the marker could paint.
  const [expiredFlashId, setExpiredFlashId] = useState(0);
  const markerVisible =
    flashId !== 0 &&
    tone != null &&
    reducedMotion &&
    expiredFlashId !== flashId;

  useEffect(() => {
    if (flashId === 0 || tone == null || !reducedMotion) return;
    const timer = setTimeout(
      () => setExpiredFlashId(flashId),
      REDUCED_MOTION_MARKER_MS,
    );
    return () => clearTimeout(timer);
  }, [flashId, tone, reducedMotion]);

  const content = children ?? value;

  return (
    <span
      {...rest}
      className={cx('flashOnChange', className)}
      data-scope="flash-on-change"
      data-part="root"
      data-direction={tone != null ? direction : undefined}
    >
      {/* Non-reduced-motion: the tint animation, re-triggered by `key`. */}
      {tone != null && !reducedMotion ? (
        <span key={flashId} className={cx('flash', `flash--tone_${tone}`)}>
          {content}
        </span>
      ) : (
        <span>{content}</span>
      )}
      {/* Reduced-motion: a discrete marker on a matching timer. */}
      {reducedMotion && markerVisible && direction !== 'none' ? (
        <span
          aria-hidden="true"
          data-part="marker"
          style={{ marginInlineStart: 4 }}
        >
          {MARKER_GLYPH[direction]}
        </span>
      ) : null}
      {announce && tone != null && direction !== 'none' ? (
        <output
          aria-live="polite"
          style={{
            position: 'absolute',
            width: 1,
            height: 1,
            overflow: 'hidden',
            clip: 'rect(0, 0, 0, 0)',
            whiteSpace: 'nowrap',
          }}
        >
          {direction === 'up' ? 'increased' : 'decreased'}
        </output>
      ) : null}
    </span>
  );
}
