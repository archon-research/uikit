import {
  DEFAULT_RANGE_PRESET,
  RangePicker,
  defaultTimeRange,
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

export const Default = () => (
  <ControlledRangePicker
    initial={{
      preset: DEFAULT_RANGE_PRESET,
      range: defaultTimeRange(),
    }}
  />
);

export const CustomSelection = () => {
  const now = new Date();
  const from = new Date(now.getTime() - 3 * 60 * 60 * 1000).toISOString();

  return (
    <ControlledRangePicker
      initial={{
        preset: 'custom',
        range: {
          from_timestamp: from,
          to_timestamp: now.toISOString(),
        },
      }}
    />
  );
};
