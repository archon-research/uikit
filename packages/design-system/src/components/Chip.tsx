import { X } from 'lucide-react';
import type { HTMLAttributes, ReactNode } from 'react';

export type ChipVariant = 'solid' | 'subtle' | 'outline';
export type ChipColorPalette =
  | 'neutral'
  | 'gray'
  | 'green'
  | 'red'
  | 'amber'
  | 'blue';
export type ChipSize = 'sm' | 'md';

type ChipProps = Omit<HTMLAttributes<HTMLSpanElement>, 'onClick'> & {
  children: ReactNode;
  /** Fill style. */
  variant?: ChipVariant;
  /** Hue, resolved via dark-aware colorPalette role tokens. */
  colorPalette?: ChipColorPalette;
  /** Density. */
  size?: ChipSize;
  /** Renders a dismiss (×) control when provided — the removable-filter case. */
  onRemove?: () => void;
  /** Overrides the auto-generated "Remove {label}" aria-label on the dismiss button. */
  removeLabel?: string;
};

/**
 * Class names emitted by the `chip` slot recipe (registered in the preset +
 * staticCss). Same variant × colorPalette model as `Badge`, plus an optional
 * `dismiss` slot for the removable-filter case. The design
 * system builds with `tsc` and ships no generated `styled-system`, so the
 * recipe is applied by its stable slot class names (base `chip__${slot}`,
 * root variant `chip__root--${key}_${value}`). Only `root` carries variant
 * classes — Panda's `colorPalette` token sets CSS custom properties that
 * cascade to the `label`/`dismiss` slots automatically (same technique as
 * `Indicator`'s dot), so they don't need their own variant classes. A
 * consumer `className` composes LAST on `root`.
 */
const slots = {
  root: 'chip__root',
  label: 'chip__label',
  dismiss: 'chip__dismiss',
} as const;

const cx = (...classes: Array<string | false | null | undefined>): string =>
  classes.filter(Boolean).join(' ');

/**
 * A removable filter chip/tag. Renders as a plain label when `onRemove` is
 * omitted; adds an accessible dismiss button when it's provided. Use for
 * active-filter summaries in a filter bar, multi-select facets, or any other
 * "you can take this back off" affordance.
 */
export function Chip({
  children,
  variant = 'subtle',
  colorPalette = 'neutral',
  size = 'md',
  onRemove,
  removeLabel,
  className,
  style,
  ...props
}: ChipProps) {
  const dismissLabel =
    removeLabel ??
    `Remove ${typeof children === 'string' ? children : 'filter'}`;

  return (
    <span
      {...props}
      className={cx(
        slots.root,
        `${slots.root}--variant_${variant}`,
        `${slots.root}--colorPalette_${colorPalette}`,
        `${slots.root}--size_${size}`,
        className,
      )}
      style={style}
      data-scope="chip"
      data-part="root"
      data-variant={variant}
      data-color-palette={colorPalette}
      data-size={size}
    >
      <span className={slots.label} data-part="label">
        {children}
      </span>
      {onRemove ? (
        <button
          type="button"
          className={slots.dismiss}
          data-part="dismiss"
          onClick={(event) => {
            event.stopPropagation();
            onRemove();
          }}
          aria-label={dismissLabel}
        >
          <X
            aria-hidden="true"
            size={12}
            strokeWidth={2.25}
            absoluteStrokeWidth
          />
        </button>
      ) : null}
    </span>
  );
}
