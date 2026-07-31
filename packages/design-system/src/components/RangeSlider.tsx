import { Slider } from '@ark-ui/react/slider';

export interface RangeSliderProps {
  /** Field label, rendered via `Slider.Label`. */
  label: string;
  min: number;
  max: number;
  step?: number;
  /** Controlled `[min, max]` selection. Bind to `useFilterRange(field).range`. */
  value: { min: number; max: number };
  /** Bind to `useFilterRange(field).setRange`. */
  onChange: (value: { min: number; max: number }) => void;
  /** Formats each thumb's value text (defaults to `toLocaleString`). */
  formatValue?: (value: number) => string;
  className?: string;
}

/**
 * Class names emitted by the `rangeSlider` slot recipe (registered in the
 * preset + staticCss). Stable slot class names (`rangeSlider__${slot}`);
 * consumer `className` composed last on `root`.
 */
const slots = {
  root: 'rangeSlider__root',
  label: 'rangeSlider__label',
  valueText: 'rangeSlider__valueText',
  control: 'rangeSlider__control',
  track: 'rangeSlider__track',
  range: 'rangeSlider__range',
  thumb: 'rangeSlider__thumb',
} as const;

const cx = (...classes: Array<string | false | null | undefined>): string =>
  classes.filter(Boolean).join(' ');

const defaultFormatValue = (value: number) => value.toLocaleString('en-US');

/**
 * A data-bound numeric range slider over Ark UI's `Slider`,
 * fixed to two thumbs (`[min, max]`). Token-themed via the `rangeSlider` slot
 * recipe; behaviour (drag, keyboard, collision) is entirely Ark's. Pairs
 * directly with `useFilterRange(field)` from the shared filter store:
 * `range`/`setRange` are that hook's return shape (`{min, max} | null`) —
 * this component always renders a concrete `value`, so bind the initial full
 * bounds when the field is unset (`range ?? { min: dataMin, max: dataMax }`).
 */
export function RangeSlider({
  label,
  min,
  max,
  step = 1,
  value,
  onChange,
  formatValue = defaultFormatValue,
  className,
}: RangeSliderProps) {
  return (
    <Slider.Root
      className={cx(slots.root, className)}
      min={min}
      max={max}
      step={step}
      value={[value.min, value.max]}
      onValueChange={(details) => {
        const [nextMin, nextMax] = details.value;
        if (nextMin === undefined || nextMax === undefined) return;
        onChange({ min: nextMin, max: nextMax });
      }}
      data-scope="range-slider"
      data-part="root"
    >
      <Slider.Label className={slots.label}>{label}</Slider.Label>
      <Slider.ValueText className={slots.valueText}>
        {formatValue(value.min)} – {formatValue(value.max)}
      </Slider.ValueText>
      <Slider.Control className={slots.control}>
        <Slider.Track className={slots.track}>
          <Slider.Range className={slots.range} />
        </Slider.Track>
        <Slider.Thumb className={slots.thumb} index={0}>
          <Slider.HiddenInput />
        </Slider.Thumb>
        <Slider.Thumb className={slots.thumb} index={1}>
          <Slider.HiddenInput />
        </Slider.Thumb>
      </Slider.Control>
    </Slider.Root>
  );
}
