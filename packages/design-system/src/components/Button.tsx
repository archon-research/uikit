import { type ButtonHTMLAttributes, type CSSProperties } from 'react';

export type ButtonVariant = 'panel' | 'item';
export type ButtonSize = 'sm' | 'md' | 'lg';
export type ButtonDensity = 'comfortable' | 'compact';
export type ButtonEmphasis = 'default' | 'solid';
export type ButtonColorPalette =
  | 'neutral'
  | 'gray'
  | 'green'
  | 'red'
  | 'amber'
  | 'blue';

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: ButtonVariant;
  size?: ButtonSize;
  iconOnly?: boolean;
  density?: ButtonDensity;
  /** Fill emphasis. `solid` produces a CTA/destructive fill via `colorPalette`. */
  emphasis?: ButtonEmphasis;
  /** Hue for `emphasis="solid"` (and any colorPalette-driven state). */
  colorPalette?: ButtonColorPalette;
  selected?: boolean;
  tone?: 'default' | 'subdued';
  gap?: number | string;
};

/**
 * Class names emitted by the `button` recipe (registered in the preset +
 * staticCss). The design-system package builds with `tsc` and ships no
 * generated `styled-system`, so the recipe cannot be imported; it is applied by
 * its stable Panda class names instead (base `button`, variant
 * `button--${key}_${value}`). Consumer `className` composes LAST.
 */
const cx = (...classes: Array<string | false | null | undefined>): string =>
  classes.filter(Boolean).join(' ');

export function Button({
  variant = 'panel',
  size = 'md',
  iconOnly = false,
  density = 'comfortable',
  emphasis = 'default',
  colorPalette = 'neutral',
  selected = false,
  tone = 'default',
  gap,
  className,
  style,
  disabled,
  type = 'button',
  ...props
}: ButtonProps) {
  // Emit ONLY non-empty single-variant classes (staticCss ['*'] covers these;
  // it does NOT cover compoundVariants). Density is translated to the
  // variant-specific class: item -> itemDensity always; panel -> panelDensity
  // only for `compact` (comfortable panels are driven by `size`).
  const recipeClassName = cx(
    'button',
    `button--variant_${variant}`,
    `button--size_${size}`,
    `button--colorPalette_${colorPalette}`,
    variant === 'item' && `button--itemDensity_${density}`,
    variant === 'panel' &&
      density === 'compact' &&
      'button--panelDensity_compact',
    emphasis === 'solid' && 'button--emphasis_solid',
    tone === 'subdued' && 'button--tone_subdued',
    selected && 'button--selected_true',
    iconOnly && 'button--iconOnly_true',
    // Square width only applies to icon-only panel buttons.
    iconOnly && variant === 'panel' && `button--iconSize_${size}`,
  );

  // `gap` remains an inline escape hatch (an arbitrary dimension, not a token);
  // everything colour/metric-related now flows through the recipe.
  const inlineStyle: CSSProperties | undefined =
    gap !== undefined || style
      ? { ...(gap !== undefined ? { gap } : undefined), ...style }
      : undefined;

  return (
    <button
      {...props}
      type={type}
      disabled={disabled}
      className={cx(recipeClassName, className)}
      style={inlineStyle}
      data-scope="button"
      data-part="root"
      data-variant={variant}
      data-size={size}
      data-density={density}
      data-emphasis={emphasis}
      data-tone={tone}
      data-disabled={disabled ? '' : undefined}
      data-selected={selected ? '' : undefined}
      data-icon-only={iconOnly ? '' : undefined}
    />
  );
}
