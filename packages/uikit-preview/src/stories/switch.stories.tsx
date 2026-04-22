import { Switch } from '@archon-research/design-system';

const frameStyle = {
  display: 'flex',
  alignItems: 'center',
  gap: '0.75rem',
  fontFamily: 'ui-sans-serif, system-ui, sans-serif',
};

export const Off = () => (
  <div style={frameStyle}>
    <Switch.Root aria-label="Notifications">
      <Switch.Thumb />
    </Switch.Root>
    <span>Notifications off</span>
  </div>
);

export const On = () => (
  <div style={frameStyle}>
    <Switch.Root defaultChecked aria-label="Notifications">
      <Switch.Thumb />
    </Switch.Root>
    <span>Notifications on</span>
  </div>
);

export const Disabled = () => (
  <div style={frameStyle}>
    <Switch.Root defaultChecked disabled aria-label="Notifications">
      <Switch.Thumb />
    </Switch.Root>
    <span>Disabled state</span>
  </div>
);
