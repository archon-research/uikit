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
export type StatTileAccent = 'neutral' | 'success' | 'warning' | 'critical';

export type StatTileProps = HTMLAttributes<HTMLDivElement> & {
  label: ReactNode;
  /**
   * The headline figure. The `value` slot is a wrap-friendly inline row, so this
   * can be a fragment — a number plus a unit, a delta `Badge`, or a trend icon —
   * without the consumer supplying layout styles. Long values wrap instead of
   * overflowing the tile.
   *
   * Spacing contract: the slot's `gap` (8px) owns the space BETWEEN children,
   * and literal whitespace between them is not rendered — flex layout drops a
   * whitespace-only text run between two items. So
   * `value={<>{n} <span>%</span></>}` renders as `n`, one 8px gap, `%`: the
   * typed space is gone and cannot be styled back. Write multi-child values
   * with no separator. For a figure that must read as one uninterrupted string
   * ("4.2 %"), pass a single text child instead, where its spaces survive.
   */
  value: ReactNode;
  /**
   * Optional supporting caption (delta, unit, timeframe). Laid out like `value`
   * (inline row, wraps) at one gap step tighter, under the same spacing
   * contract: the 4px gap owns inter-child spacing, literal whitespace between
   * children is not rendered.
   */
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
  /**
   * Leading-edge state stripe via the `statTile` `accent` slot variant. Off by
   * default (no stripe, unchanged frame). A tone renders a 3px colored left
   * border; keep the state in the value/sub too — an accent never carries it
   * alone.
   */
  accent?: StatTileAccent;
  /**
   * Runtime hue for the accent stripe (any CSS color, e.g. an instrument's
   * `var(--...)`). Applied as an inline `border-left-color` that overrides the
   * `accent` tone color, and turns the stripe on (width) even without `accent`.
   */
  accentColor?: string;
};

export type StatRowProps = HTMLAttributes<HTMLDivElement>;

export function StatTile({
  label,
  value,
  sub,
  tone = 'default',
  labelCase = 'none',
  density = 'comfortable',
  accent,
  accentColor,
  className,
  style,
  ...rest
}: StatTileProps) {
  const toneSuffix = tone === 'default' ? false : `--tone_${tone}`;
  const densitySuffix =
    density === 'comfortable' ? false : `--density_${density}`;
  // A runtime color turns the stripe on even without an explicit `accent` tone
  // (defaulting to `neutral` for the border width); the inline color then wins.
  const resolvedAccent = accent ?? (accentColor != null ? 'neutral' : null);
  const mergedStyle =
    accentColor != null ? { borderLeftColor: accentColor, ...style } : style;

  return (
    <div
      {...rest}
      className={cx(
        'statTile__root',
        resolvedAccent && `statTile__root--accent_${resolvedAccent}`,
        className,
      )}
      style={mergedStyle}
      data-scope="stat-tile"
      data-part="root"
      data-tone={tone}
      data-accent={resolvedAccent ?? undefined}
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
