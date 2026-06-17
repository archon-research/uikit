import {
  DEFAULT_RANGE_PRESET,
  RangePicker,
  type RangePreset,
  type TimeRange,
} from '@archon-research/design-system';
import { useState } from 'react';

import { css } from '../../../styled-system/css';

export default {
  title: 'Molecules/RangePicker',
};

const stackClassName = css({
  display: 'grid',
  gap: '5',
  maxWidth: 'md',
  p: '6',
  fontFamily: 'sans',
  color: 'text.default',
});

const detailsClassName = css({
  display: 'grid',
  gap: '1',
  p: '3',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'border.subtle',
  borderRadius: 'md',
  bg: 'surface.subtle',
  fontSize: 'xs',
  color: 'text.subtle',
});

type ControlledState = {
  preset: RangePreset;
  range: TimeRange;
};

function ControlledRangePicker({ initial }: { initial: ControlledState }) {
  const [state, setState] = useState<ControlledState>(initial);

  return (
    <div className={stackClassName}>
      <RangePicker
        preset={state.preset}
        range={state.range}
        onChange={(preset, range) => setState({ preset, range })}
      />

      <div className={detailsClassName}>
        <div>Preset: {state.preset}</div>
        <div>From: {state.range.from_timestamp ?? '(unset)'}</div>
        <div>To: {state.range.to_timestamp ?? '(unset)'}</div>
      </div>
    </div>
  );
}

// Stories use fixed timestamps rather than `new Date()` so the rendered range
// text is deterministic and the captured snapshots stay stable across runs.
export const Default = () => (
  <ControlledRangePicker
    initial={{
      preset: DEFAULT_RANGE_PRESET,
      // A 30-day span matching DEFAULT_RANGE_PRESET, frozen for snapshots.
      range: {
        from_timestamp: '2025-12-16T12:00:00.000Z',
        to_timestamp: '2026-01-15T12:00:00.000Z',
      },
    }}
  />
);

export const CustomSelection = () => (
  <ControlledRangePicker
    initial={{
      preset: 'custom',
      // A frozen 3-hour custom span.
      range: {
        from_timestamp: '2026-01-15T09:00:00.000Z',
        to_timestamp: '2026-01-15T12:00:00.000Z',
      },
    }}
  />
);
