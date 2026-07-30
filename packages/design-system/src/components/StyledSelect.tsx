import { ChevronDown } from 'lucide-react';
import { type ReactNode, type SelectHTMLAttributes } from 'react';

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  children: ReactNode;
  className?: string;
};

/** @deprecated Use SelectProps instead. */
export type StyledSelectProps = SelectProps;

/**
 * Class names emitted by the `select` slot recipe (registered in the preset +
 * staticCss). The design-system package builds with `tsc` and ships no
 * generated `styled-system`, so styling is applied by stable Panda slot class
 * names (`${className}__${slot}`) rather than importing `css()`. Because these
 * live in the `recipes` cascade layer, a consumer `className` composed LAST on
 * `root` (utilities layer) overrides recipe styles — e.g. `css({ width })`
 * beats the recipe's `width: full`.
 */
const slots = {
  root: 'select__root',
  control: 'select__control',
  indicator: 'select__indicator',
} as const;

const cx = (...classes: Array<string | false | null | undefined>): string =>
  classes.filter(Boolean).join(' ');

function SelectChevron() {
  return (
    <ChevronDown
      aria-hidden="true"
      className={slots.indicator}
      size={16}
      strokeWidth={1.9}
      absoluteStrokeWidth
    />
  );
}

export function Select({ children, className, ...props }: SelectProps) {
  return (
    <div
      className={cx(slots.root, className)}
      data-scope="select"
      data-part="root"
    >
      <select {...props} className={slots.control} data-part="control">
        {children}
      </select>
      <SelectChevron />
    </div>
  );
}

/** @deprecated Use Select instead. */
export const StyledSelect = Select;
