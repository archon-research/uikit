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
};
