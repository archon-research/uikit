import { type HTMLAttributes, type ReactNode } from 'react';

/**
 * Class names emitted by the `keyValueTable` slot recipe (registered in the
 * preset + staticCss). The design-system ships no generated `styled-system`, so
 * styling is applied by stable slot class names (`keyValueTable__${slot}`,
 * variant `keyValueTable__value--mono_${bool}`).
 */
const cx = (...classes: Array<string | false | null | undefined>): string =>
  classes.filter(Boolean).join(' ');

export type KeyValueTableDensity = 'comfortable' | 'compact';

export type KeyValueRow = {
  key: string;
  label: ReactNode;
  value: ReactNode;
  /**
   * Render this value in the figure treatment (mono, tabular figures).
   * Defaults to true; set false for a text value (a status, a name).
   */
  mono?: boolean;
  /** Value alignment. Defaults to `end` (right), matching numeric columns. */
  align?: 'start' | 'end';
};

export type KeyValueTableProps = HTMLAttributes<HTMLTableElement> & {
  rows: KeyValueRow[];
  /** Optional caption / heading for the table. */
  caption?: ReactNode;
  /** Row density. Defaults to `comfortable`. */
  density?: KeyValueTableDensity;
};

/**
 * A small label/value (or summary) table. Each row is a `<th scope="row">`
 * label and a value cell; values default to the figure treatment so numbers
 * align down the column without hand-rolling the mono/tabular css. Reach for
 * this instead of a raw `<table>` for a handful of static rows.
 */
export function KeyValueTable({
  rows,
  caption,
  density = 'comfortable',
  className,
  ...rest
}: KeyValueTableProps) {
  return (
    <table
      {...rest}
      className={cx(
        'keyValueTable__root',
        density !== 'comfortable' && `keyValueTable__root--density_${density}`,
        className,
      )}
      data-scope="key-value-table"
      data-part="root"
    >
      {caption != null ? (
        <caption className="keyValueTable__caption" data-part="caption">
          {caption}
        </caption>
      ) : null}
      <tbody>
        {rows.map((row) => {
          const mono = row.mono ?? true;
          return (
            <tr
              key={row.key}
              className={cx(
                'keyValueTable__row',
                density !== 'comfortable' &&
                  `keyValueTable__row--density_${density}`,
              )}
              data-part="row"
            >
              <th
                scope="row"
                className={cx(
                  'keyValueTable__label',
                  density !== 'comfortable' &&
                    `keyValueTable__label--density_${density}`,
                )}
                data-part="label"
              >
                {row.label}
              </th>
              <td
                className={cx(
                  'keyValueTable__value',
                  `keyValueTable__value--mono_${mono}`,
                  density !== 'comfortable' &&
                    `keyValueTable__value--density_${density}`,
                )}
                data-part="value"
                style={row.align ? { textAlign: row.align } : undefined}
              >
                {row.value}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
