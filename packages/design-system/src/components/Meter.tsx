import { type HTMLAttributes, type ReactNode } from 'react';

/**
 * Class names emitted by the `meter` slot recipe (registered in the preset +
 * staticCss). The design-system ships no generated `styled-system`, so styling
 * is applied by stable slot class names (`meter__${slot}`, variant
 * `meter__${slot}--${key}_${value}`). Runtime positions (fill width, marker
 * offset) can't be classes, so the component sets them inline — which is the
 * point: consumers stop hand-rolling that.
 */
const cx = (...classes: Array<string | false | null | undefined>): string =>
  classes.filter(Boolean).join(' ');

export type MeterTone = 'neutral' | 'success' | 'warning' | 'critical';

/** A reference mark inside the range — e.g. a recorded limit. */
export type MeterMarker = {
  /** Position on the same scale as `value` (between `min` and `max`). */
  at: number;
  /** Accessible/visual label for the mark. */
  label?: string;
  /** Optional hue; defaults to the strong ink color. */
  tone?: MeterTone;
};

export type MeterProps = Omit<HTMLAttributes<HTMLDivElement>, 'children'> & {
  value: number;
  min?: number;
  max?: number;
  /** Fill hue via `colorPalette` role tokens. */
  tone?: MeterTone;
  /** Reference marks inside the range (e.g. a recorded limit). */
  markers?: MeterMarker[];
  /** Heading shown at the start of the header row. */
  label?: ReactNode;
  /**
   * The value text — both the `aria-valuetext` and the visible readout. When
   * omitted it is composed from `value` (and `denominator`, if given).
   */
  valueText?: string;
  /** Shown after the value in the composed readout (e.g. a max/limit). */
  denominator?: ReactNode;
  /** Show the header row (label + readout). Defaults to true. */
  showHeader?: boolean;
  /**
   * Render a scale row beneath the track showing the `min` and `max` bounds at
   * the ends and each marker's `label` positioned at its value — e.g.
   * `0 · target · max`. Off by default.
   */
  showScale?: boolean;
  /** Formats the `min`/`max` bounds in the scale row. Defaults to `String`. */
  formatBound?: (value: number) => string;
  /**
   * A caption line beneath the track (and scale) — e.g. what the value is
   * measured against, or the governing policy. Renders nothing when omitted.
   */
  footer?: ReactNode;
};

const TONE_COLOR_VAR: Record<MeterTone, string> = {
  neutral: 'var(--colors-text-strong, currentColor)',
  success: 'var(--colors-text-success, currentColor)',
  warning: 'var(--colors-text-warning, currentColor)',
  critical: 'var(--colors-text-critical, currentColor)',
};

/**
 * Position of `value` within `[min, max]` as a clamped 0–100 percentage.
 * Exported for the pure-logic test; a non-finite or zero-width range yields 0.
 */
export function meterPercent(value: number, min: number, max: number): number {
  if (!Number.isFinite(value) || !Number.isFinite(min) || !Number.isFinite(max))
    return 0;
  if (max <= min) return 0;
  const ratio = (value - min) / (max - min);
  return Math.max(0, Math.min(1, ratio)) * 100;
}

/**
 * A measurement inside a range (`role="meter"`), with optional reference marks
 * for a recorded limit *inside* that range — the case Ark `Progress` (a
 * task-completion `progressbar`) does not model. The value text is composed
 * from the parts, so the consumer never joins them by hand.
 */
export function Meter({
  value,
  min = 0,
  max = 100,
  tone = 'neutral',
  markers,
  label,
  valueText,
  denominator,
  showHeader = true,
  showScale = false,
  formatBound = String,
  footer,
  className,
  ...rest
}: MeterProps) {
  const pct = meterPercent(value, min, max);
  const composedValueText =
    valueText ??
    (denominator != null ? `${value} / ${denominator}` : String(value));

  return (
    <div
      {...rest}
      className={cx('meter__root', `meter__root--tone_${tone}`, className)}
      data-scope="meter"
      data-part="root"
      data-tone={tone}
    >
      {showHeader ? (
        <div className="meter__header" data-part="header">
          {label != null ? (
            <span className="meter__label" data-part="label">
              {label}
            </span>
          ) : (
            <span />
          )}
          <span className="meter__valueText" data-part="valueText">
            {composedValueText}
          </span>
        </div>
      ) : null}
      <div
        className="meter__track"
        data-part="track"
        // oxlint-disable-next-line jsx-a11y/prefer-tag-over-role -- native `<meter>` can't be styled (custom track/fill/markers), so this is the standard ARIA-authoring-practices pattern for a custom-styled meter
        role="meter"
        aria-valuenow={value}
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuetext={composedValueText}
        aria-label={typeof label === 'string' ? label : undefined}
      >
        <div
          className="meter__fill"
          data-part="fill"
          style={{ width: `${pct}%` }}
        />
        {markers?.map((marker, index) => {
          const markerPct = meterPercent(marker.at, min, max);
          return (
            <div
              key={`${marker.at}-${index}`}
              className="meter__marker"
              data-part="marker"
              data-tone={marker.tone ?? 'neutral'}
              title={marker.label}
              aria-hidden="true"
              style={{
                insetInlineStart: `${markerPct}%`,
                background: TONE_COLOR_VAR[marker.tone ?? 'neutral'],
              }}
            />
          );
        })}
      </div>
      {showScale ? (
        <div className="meter__scale" data-part="scale">
          <span className="meter__scaleBound" data-part="scale-min">
            {formatBound(min)}
          </span>
          {markers?.map((marker, index) =>
            marker.label != null ? (
              <span
                key={`scale-${marker.at}-${index}`}
                className="meter__scaleMark"
                data-part="scale-mark"
                style={{
                  insetInlineStart: `${meterPercent(marker.at, min, max)}%`,
                }}
              >
                {marker.label}
              </span>
            ) : null,
          )}
          <span className="meter__scaleBound" data-part="scale-max">
            {formatBound(max)}
          </span>
        </div>
      ) : null}
      {footer != null ? (
        <div className="meter__footer" data-part="footer">
          {footer}
        </div>
      ) : null}
    </div>
  );
}
