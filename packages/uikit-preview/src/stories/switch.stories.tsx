import { Switch } from '@archon-research/design-system';

import '../../styled-system/styles.css';
import { css } from '../../styled-system/css';
import { toggleSwitch } from '../../styled-system/recipes';

const frameClassName = css({
  alignItems: 'center',
  display: 'flex',
  gap: '3',
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
    <span>Notifications off</span>
  </div>
);

export const On = () => (
  <div className={frameClassName}>
    {renderSwitch({ 'aria-label': 'Notifications', defaultChecked: true })}
    <span>Notifications on</span>
  </div>
);

export const Disabled = () => (
  <div className={frameClassName}>
    {renderSwitch({
      'aria-label': 'Notifications',
      defaultChecked: true,
      disabled: true,
    })}
    <span>Disabled state</span>
  </div>
);
