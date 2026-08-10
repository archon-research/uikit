import type { HTMLAttributes, ReactNode } from 'react';

export type BadgeVariant = 'solid' | 'subtle' | 'surface' | 'outline';
export type BadgeColorPalette =
  | 'neutral'
  | 'gray'
  | 'green'
  | 'red'
  | 'amber'
  | 'blue';
export type BadgeSize = 'sm' | 'md';

/**
 * @deprecated Use `variant` + `colorPalette` instead. `tone` is kept as a
 * back-compat shim that maps onto `(colorPalette, variant="subtle")`.
 */
export type BadgeTone = 'neutral' | 'success' | 'warning' | 'danger';

type BadgeProps = HTMLAttributes<HTMLSpanElement> & {
  children: ReactNode;
  /** Fill style. */
  variant?: BadgeVariant;
  /** Hue, resolved via dark-aware colorPalette role tokens. */
  colorPalette?: BadgeColorPalette;
  /** Density. `md` preserves the previous 12px badge. */
  size?: BadgeSize;
  /**
   * @deprecated Back-compat only. Maps to `colorPalette` with `variant="subtle"`.
   * Ignored when `colorPalette` is set explicitly.
   */
  tone?: BadgeTone;
};

/**
 * Class names emitted by the `badge` recipe (registered in the preset +
 * staticCss). The design-system builds with `tsc` and ships no generated
 * `styled-system`, so the recipe is applied by its stable class names (base
 * `badge`, variant `badge--${key}_${value}`). Consumer `className` composes LAST.
 */
const cx = (...classes: Array<string | false | null | undefined>): string =>
  classes.filter(Boolean).join(' ');

const toneToColorPalette: Record<BadgeTone, BadgeColorPalette> = {
  neutral: 'neutral',
  success: 'green',
  warning: 'amber',
  danger: 'red',
};

export function Badge({
  children,
  variant = 'subtle',
  colorPalette,
  size = 'md',
  tone,
  className,
  style,
  ...props
}: BadgeProps) {
  // Explicit `colorPalette` wins; otherwise fall back to the legacy `tone`
  // mapping, then to neutral.
  const resolvedColorPalette: BadgeColorPalette =
    colorPalette ?? (tone ? toneToColorPalette[tone] : 'neutral');

  return (
    <span
      {...props}
      className={cx(
        'badge',
        `badge--variant_${variant}`,
        `badge--colorPalette_${resolvedColorPalette}`,
        `badge--size_${size}`,
        className,
      )}
      style={style}
      data-scope="badge"
      data-part="root"
      data-variant={variant}
      data-color-palette={resolvedColorPalette}
      data-size={size}
      data-tone={tone}
    >
      {children}
    </span>
  );
}
