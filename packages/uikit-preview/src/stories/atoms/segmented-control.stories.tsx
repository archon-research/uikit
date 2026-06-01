import { ToggleGroup } from '@archon-research/design-system';

import { css } from '../../../styled-system/css';
import { segmentedControl } from '../../../styled-system/recipes';

export default {
  title: 'Atoms/Segmented Control',
};

const frameClassName = css({
  alignItems: 'center',
  display: 'grid',
  gap: '4',
  minHeight: '40',
  p: '6',
  fontFamily: 'sans',
});

const hintClassName = css({
  color: 'text.muted',
  fontSize: 'sm',
  lineHeight: '1.5',
});

const renderSegmentedControl = (defaultValue = 'overview') => {
  const classes = segmentedControl();

  return (
    <ToggleGroup.Root
      className={classes.group}
      defaultValue={[defaultValue]}
      aria-label="View mode"
    >
      <ToggleGroup.Item className={classes.item} value="overview">
        Overview
      </ToggleGroup.Item>
      <ToggleGroup.Item className={classes.item} value="positions">
        Positions
      </ToggleGroup.Item>
      <ToggleGroup.Item className={classes.item} value="activity">
        Activity
      </ToggleGroup.Item>
    </ToggleGroup.Root>
  );
};

export const Default = () => (
  <div className={frameClassName}>{renderSegmentedControl()}</div>
);

export const ActiveStateOn = () => (
  <div className={frameClassName}>
    {renderSegmentedControl('positions')}
    <p className={hintClassName}>
      Active segment uses semantic selected styling through `data-state="on"`.
    </p>
  </div>
);
