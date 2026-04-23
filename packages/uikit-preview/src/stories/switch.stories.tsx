import { Switch } from '@archon-research/design-system';

import '../../styled-system/styles.css';
import { css } from '../../styled-system/css';
import { toggleSwitch } from '../../styled-system/recipes';

export default {
  title: 'Components/Switch',
};

const frameClassName = css({
  alignItems: 'center',
  display: 'flex',
  gap: '3',
  minHeight: '40',
  p: '6',
  fontFamily: 'sans',
});

const labelClassName = css({
  color: 'text.default',
  fontSize: 'sm',
  fontWeight: 'medium',
  lineHeight: '1.4',
});

const renderSwitch = (props?: React.ComponentProps<typeof Switch.Root>) => {
  const classes = toggleSwitch();

  return (
    <Switch.Root {...props} className={classes.root}>
      <Switch.Thumb className={classes.thumb} />
    </Switch.Root>
  );
};

export const Off = () => (
  <div className={frameClassName}>
    {renderSwitch({ 'aria-label': 'Notifications' })}
    <span className={labelClassName}>Notifications off</span>
  </div>
);

export const On = () => (
  <div className={frameClassName}>
    {renderSwitch({ 'aria-label': 'Notifications', defaultChecked: true })}
    <span className={labelClassName}>Notifications on</span>
  </div>
);

export const Disabled = () => (
  <div className={frameClassName}>
    {renderSwitch({
      'aria-label': 'Notifications',
      defaultChecked: true,
      disabled: true,
    })}
    <span className={labelClassName}>Disabled state</span>
  </div>
);
