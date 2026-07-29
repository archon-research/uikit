import { Sparkline } from '@archon-research/design-system';

import { css } from '../../../styled-system/css';

export default {
  title: 'Atoms/Sparkline',
};

const frameClassName = css({
  display: 'grid',
  gap: '6',
  p: '6',
  backgroundColor: 'surface.canvas',
  fontFamily: 'sans',
  color: 'text.default',
});

const rowClassName = css({
  display: 'flex',
  alignItems: 'center',
  gap: '4',
  flexWrap: 'wrap',
});

const captionClassName = css({
  fontSize: 'sm',
  color: 'text.muted',
});

const railClassName = css({
  display: 'flex',
  alignItems: 'baseline',
  gap: '3',
  p: '4',
  borderColor: 'border.subtle',
  borderStyle: 'solid',
  borderWidth: '1px',
  borderRadius: 'md',
  backgroundColor: 'surface.default',
  width: 'fit-content',
});

const valueClassName = css({
  fontSize: 'lg',
  fontWeight: 'semibold',
  color: 'text.default',
});

const UPTREND = [4, 6, 5, 8, 7, 11, 10, 14, 13, 17];
const VOLATILE = [10, 4, 12, 6, 14, 5, 13, 7, 16, 9];
const DOWNTREND = [17, 15, 16, 12, 13, 9, 10, 6, 7, 3];

// Default line uses the primary chart-series token, so it tracks the theme.
export const Line = () => (
  <div className={frameClassName}>
    <div className={rowClassName}>
      <Sparkline data={UPTREND} aria-label="Uptrend" />
      <Sparkline data={VOLATILE} aria-label="Volatile series" />
      <Sparkline data={DOWNTREND} aria-label="Downtrend" />
    </div>
    <p className={captionClassName}>data.length = 10, default 160×48</p>
  </div>
);

// `area` fills beneath the line with the chart-area token.
export const Area = () => (
  <div className={frameClassName}>
    <div className={rowClassName}>
      <Sparkline data={UPTREND} area aria-label="Uptrend with area fill" />
      <Sparkline data={VOLATILE} area aria-label="Volatile with area fill" />
    </div>
    <p className={captionClassName}>area fill under the trend line</p>
  </div>
);

// Custom sizing; a taller, wider micro-chart.
export const Sizes = () => (
  <div className={frameClassName}>
    <div className={rowClassName}>
      <Sparkline data={UPTREND} width={80} height={24} aria-label="Small" />
      <Sparkline data={UPTREND} width={160} height={48} aria-label="Medium" />
      <Sparkline
        data={UPTREND}
        width={280}
        height={72}
        strokeWidth={2}
        aria-label="Large"
      />
    </div>
  </div>
);

// A metric rail: value paired with an inline trend.
export const InMetricRail = () => (
  <div className={frameClassName}>
    <div className={railClassName}>
      <span className={valueClassName}>$10.68M</span>
      <span className={captionClassName}>7d</span>
      <Sparkline data={UPTREND} width={96} height={28} aria-label="AUM 7d" />
    </div>
  </div>
);
