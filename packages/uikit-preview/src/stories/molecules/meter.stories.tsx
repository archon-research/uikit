import { Meter } from '@archon-research/design-system';

import { css } from '../../../styled-system/css';

export default {
  title: 'Molecules/Meter',
};

const frameClassName = css({
  display: 'grid',
  gap: '6',
  p: '6',
  maxWidth: '480px',
  backgroundColor: 'surface.canvas',
  fontFamily: 'sans',
  color: 'text.default',
});

const captionClassName = css({
  fontSize: 'sm',
  color: 'text.muted',
});

// A measurement inside a range (role="meter"), distinct from a task-completion
// progressbar. tone sets the fill hue.
export const Tones = () => (
  <div className={frameClassName}>
    <Meter label="Utilization" value={38} max={100} valueText="38%" />
    <Meter
      label="Capacity"
      value={72}
      max={100}
      valueText="72%"
      tone="warning"
    />
    <Meter
      label="Exposure"
      value={94}
      max={100}
      valueText="94%"
      tone="critical"
    />
  </div>
);

// A marker places a recorded limit *inside* the range — the case a progressbar
// cannot model.
export const WithLimitMarker = () => (
  <div className={frameClassName}>
    <p className={captionClassName}>
      Value against a recorded limit inside the range.
    </p>
    <Meter
      label="Position size"
      value={62}
      max={100}
      denominator="100"
      tone="success"
      markers={[{ at: 80, label: 'Limit', tone: 'critical' }]}
    />
  </div>
);
