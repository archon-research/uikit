import { ToggleGroup } from '@archon-research/design-system';

import { css } from '../../../styled-system/css';

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

const groupClassName = css({
  alignItems: 'center',
  bg: 'transparent',
  borderColor: 'border.default',
  borderRadius: 'sm',
  borderStyle: 'solid',
  borderWidth: '1px',
  display: 'inline-flex',
  gap: '0.5',
  p: '0.5',
});

const itemClassName = css({
  '&[data-pressed]': {
    bg: 'interactive.selected',
    color: 'text.default',
  },
  '&[data-state="on"]': {
    bg: 'interactive.selected',
    color: 'text.default',
  },
  _hover: {
    bg: 'interactive.hover',
    color: 'text.default',
  },
  alignItems: 'center',
  borderRadius: 'xs',
  color: 'text.muted',
  cursor: 'pointer',
  display: 'inline-flex',
  fontSize: 'sm',
  h: '7',
  justifyContent: 'center',
  lineHeight: 'normal',
  px: '3',
  py: '1',
  transitionDuration: 'fast',
  transitionProperty: 'background-color, color, border-color, box-shadow',
});

const renderSegmentedControl = (defaultValue = 'overview') => {
  return (
    <ToggleGroup.Root
      className={groupClassName}
      defaultValue={[defaultValue]}
      aria-label="View mode"
    >
      <ToggleGroup.Item className={itemClassName} value="overview">
        Overview
      </ToggleGroup.Item>
      <ToggleGroup.Item className={itemClassName} value="positions">
        Positions
      </ToggleGroup.Item>
      <ToggleGroup.Item className={itemClassName} value="activity">
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
