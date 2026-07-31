import type { ReactNode } from 'react';

export interface FacetOption {
  /** The raw field value this option filters to (e.g. a category name). */
  value: string;
  /** Display label; defaults to `value`. */
  label?: string;
  /** Row count for this facet value at the current (unfiltered-by-this-field) scope. */
  count: number;
}

type FacetedMultiSelectProps = {
  /** Field label / fieldset legend (e.g. "Category", "Region"). */
  label: string;
  options: FacetOption[];
  /** Currently-selected values. Empty = "no filter, show everything" — bind directly to `useFilterValues(field).values`. */
  values: string[];
  /** Add/remove one value. Bind directly to `useFilterValues(field).toggle`. */
  onToggle: (value: string) => void;
  /** Optional "Clear" affordance. Bind to `useFilterValues(field).clear`. */
  onClear?: () => void;
  emptyMessage?: ReactNode;
  className?: string;
};

/**
 * Class names emitted by the `facetedMultiSelect` slot recipe (registered in
 * the preset + staticCss). Stable slot class names (`facetedMultiSelect__${slot}`),
 * consumer `className` composed last on `root`.
 */
const slots = {
  root: 'facetedMultiSelect__root',
  header: 'facetedMultiSelect__header',
  title: 'facetedMultiSelect__title',
  clear: 'facetedMultiSelect__clear',
  list: 'facetedMultiSelect__list',
  item: 'facetedMultiSelect__item',
  checkbox: 'facetedMultiSelect__checkbox',
  itemLabel: 'facetedMultiSelect__itemLabel',
  count: 'facetedMultiSelect__count',
  empty: 'facetedMultiSelect__empty',
} as const;

const cx = (...classes: Array<string | false | null | undefined>): string =>
  classes.filter(Boolean).join(' ');

/**
 * A faceted multi-select filter: a checklist of field values with their row
 * counts. Data-agnostic — the caller computes `options`
 * (typically via a `Map`/`reduce` over the unfiltered rows) and this component
 * is a controlled checklist over `values`/`onToggle`. Pairs directly with
 * `useFilterValues(field)` from `@archon-research/design-system`'s filter
 * store: `values`/`toggle`/`clear` are that hook's return shape verbatim.
 */
export function FacetedMultiSelect({
  label,
  options,
  values,
  onToggle,
  onClear,
  emptyMessage = 'No options.',
  className,
}: FacetedMultiSelectProps) {
  return (
    <fieldset
      className={cx(slots.root, className)}
      data-scope="faceted-multi-select"
      data-part="root"
    >
      <div className={slots.header} data-part="header">
        <legend className={slots.title} data-part="title">
          {label}
        </legend>
        {onClear && values.length > 0 ? (
          <button
            type="button"
            className={slots.clear}
            data-part="clear"
            onClick={onClear}
          >
            Clear
          </button>
        ) : null}
      </div>

      {options.length === 0 ? (
        <p className={slots.empty} data-part="empty">
          {emptyMessage}
        </p>
      ) : (
        <ul className={slots.list} data-part="list">
          {options.map((option) => {
            const checked = values.includes(option.value);
            return (
              <li
                key={option.value}
                className={slots.item}
                data-part="item"
                data-checked={checked ? '' : undefined}
              >
                <label className={slots.itemLabel} data-part="item-label">
                  <input
                    type="checkbox"
                    className={slots.checkbox}
                    data-part="checkbox"
                    checked={checked}
                    onChange={() => onToggle(option.value)}
                  />
                  {option.label ?? option.value}
                </label>
                <span className={slots.count} data-part="count">
                  {option.count.toLocaleString('en-US')}
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </fieldset>
  );
}
