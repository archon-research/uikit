import { type HTMLAttributes, type ReactNode } from 'react';

/**
 * Class names emitted by the `statTile` slot recipe and the `statRow` recipe
 * (both registered in the preset + staticCss). The design-system package
 * builds with `tsc` and ships no generated `styled-system`, so styling is
 * applied by stable Panda class names. Conventions: slot base =
 * `${className}__${slot}`; a slot variant = `${className}__${slot}--${key}_${value}`;
 * a single-part recipe base = `${className}`.
 */
const cx = (...classes: Array<string | false | null | undefined>): string =>
  classes.filter(Boolean).join(' ');

export type StatTileTone = 'default' | 'success' | 'critical';
export type StatTileLabelCase = 'none' | 'upper';
export type StatTileDensity = 'comfortable' | 'compact';

export type StatTileProps = HTMLAttributes<HTMLDivElement> & {
  label: ReactNode;
  value: ReactNode;
  /** Optional supporting caption (delta, unit, timeframe). */
  sub?: ReactNode;
  /** Semantic coloring for the value + sub caption. */
  tone?: StatTileTone;
  /**
   * Case treatment for the label via the `statTile` `labelCase` slot variant.
   * Defaults to `none` (no transform) so existing labels render unchanged;
   * `upper` renders an uppercase, wider-tracked micro-label.
   */
  labelCase?: StatTileLabelCase;
  /**
   * Sizing treatment via the `statTile` `density` slot variant. Defaults to
   * `comfortable` (unchanged label + sub sizing); `compact` renders the label
   * and sub caption as tighter micro type for information-dense layouts.
   */
  density?: StatTileDensity;
};

export type StatRowProps = HTMLAttributes<HTMLDivElement>;

export function StatTile({
  label,
  value,
  sub,
  tone = 'default',
  labelCase = 'none',
  density = 'comfortable',
  className,
  ...rest
}: StatTileProps) {
  const toneSuffix = tone === 'default' ? false : `--tone_${tone}`;
  const densitySuffix =
    density === 'comfortable' ? false : `--density_${density}`;

  return (
    <div
      {...rest}
      className={cx('statTile__root', className)}
      style={{ letterSpacing: '0.5px' }}
      data-scope="stat-tile"
      data-part="root"
      data-tone={tone}
    >
      <div
        className={cx(
          'statTile__label',
          labelCase !== 'none' && `statTile__label--labelCase_${labelCase}`,
          densitySuffix && `statTile__label${densitySuffix}`,
        )}
        data-part="label"
      >
        {label}
      </div>
      <div
        className={cx(
          'statTile__value',
          toneSuffix && `statTile__value${toneSuffix}`,
        )}
        data-part="value"
      >
        {value}
      </div>
      {sub != null ? (
        <div
          className={cx(
            'statTile__sub',
            toneSuffix && `statTile__sub${toneSuffix}`,
            densitySuffix && `statTile__sub${densitySuffix}`,
          )}
          data-part="sub"
        >
          {sub}
        </div>
      ) : null}
    </div>
  );
}

/** Responsive 2 -> 4 column grid of {@link StatTile}s. */
export function StatRow({ className, children, ...rest }: StatRowProps) {
  return (
    <div
      {...rest}
      className={cx('statRow', className)}
      data-scope="stat-row"
      data-part="root"
    >
      {children}
    </div>
  );
}
