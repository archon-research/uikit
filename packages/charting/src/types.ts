export type ChartDatum = {
  label: string;
  value: number;
};

export type ChartMargins = {
  top: number;
  right: number;
  bottom: number;
  left: number;
};

export type BaseChartProps = {
  data: readonly ChartDatum[];
  width?: number;
  height?: number;
  ariaLabel?: string;
  getDatumTooltip?: (datum: ChartDatum, index: number) => string | undefined;
  /**
   * Force the value domain to include zero, anchoring the chart to a zero
   * baseline. Off by default, so the domain is derived from the data's own
   * min/max. Enable it for part-to-whole charts (e.g. bars) where a truncated
   * axis would misrepresent the data.
   */
  includeZero?: boolean;
};
