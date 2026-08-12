export type ChartDataTableProps = {
  /** Optional `<caption>`; also the accessible name of the table. */
  caption?: string;
  /** Column headers. The first column is treated as each row's header. */
  columns: string[];
  /** Row data, aligned to `columns`. The first cell of each row is a row header. */
  rows: Array<Array<string | number>>;
  /**
   * When true (the default), the table is present in the accessibility tree
   * but visually clipped — a screen-reader mirror of a purely visual chart.
   * Set false to show the table (e.g. a "show data" toggle).
   */
  visuallyHidden?: boolean;
};

/**
 * Standard visually-hidden style: kept in the accessibility tree and copyable,
 * but clipped from sighted view. Inlined (no design-system dependency) for the
 * same reason as `ChartLegend`.
 */
const visuallyHiddenStyle = {
  position: 'absolute',
  width: 1,
  height: 1,
  padding: 0,
  margin: -1,
  overflow: 'hidden',
  clip: 'rect(0, 0, 0, 0)',
  whiteSpace: 'nowrap',
  border: 0,
} as const;

/**
 * An accessible `<table>` mirror of a chart's series data. A chart drawn as
 * inline SVG carries no tabular structure for assistive tech; pairing it with
 * this table (visually hidden by default) gives screen-reader users the same
 * numbers without changing the visual design.
 *
 * The first column is rendered as a row header (`<th scope="row">`) so each
 * row is announced with its label; the header row uses `scope="col"`.
 */
export function ChartDataTable({
  caption,
  columns,
  rows,
  visuallyHidden = true,
}: ChartDataTableProps) {
  const table = (
    <table style={{ borderCollapse: 'collapse', width: '100%', fontSize: 13 }}>
      {caption ? <caption>{caption}</caption> : null}
      <thead>
        <tr>
          {columns.map((column, index) => (
            <th
              key={column}
              scope="col"
              style={{ textAlign: index === 0 ? 'left' : 'right' }}
            >
              {column}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, rowIndex) => (
          <tr key={rowIndex}>
            {row.map((cell, cellIndex) =>
              cellIndex === 0 ? (
                <th key={cellIndex} scope="row" style={{ textAlign: 'left' }}>
                  {cell}
                </th>
              ) : (
                <td key={cellIndex} style={{ textAlign: 'right' }}>
                  {cell}
                </td>
              ),
            )}
          </tr>
        ))}
      </tbody>
    </table>
  );

  if (!visuallyHidden) return table;
  return <span style={visuallyHiddenStyle}>{table}</span>;
}
