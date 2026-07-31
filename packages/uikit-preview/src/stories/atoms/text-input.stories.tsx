import { TextInput, Textarea } from '@archon-research/design-system';

import { css } from '../../../styled-system/css';

export default {
  title: 'Atoms/TextInput',
};

const frameClassName = css({
  display: 'grid',
  gap: '6',
  p: '6',
  backgroundColor: 'surface.canvas',
  fontFamily: 'sans',
  color: 'text.default',
  maxWidth: '420px',
});

// Bare input with only a placeholder.
export const Default = () => (
  <div className={frameClassName}>
    <TextInput placeholder="Search positions" />
  </div>
);

// Label + helper text wired through the Ark Field parts.
export const WithLabelAndHelper = () => (
  <div className={frameClassName}>
    <TextInput
      label="Wallet address"
      helperText="Paste the 0x address of the vault owner."
      placeholder="0x…"
    />
  </div>
);

// Invalid state surfaces the error text beneath the control.
export const Error = () => (
  <div className={frameClassName}>
    <TextInput
      label="Allocation limit"
      invalid
      defaultValue="abc"
      errorText="Enter a numeric percentage between 0 and 100."
    />
  </div>
);

// Required field renders the required indicator next to the label.
export const Required = () => (
  <div className={frameClassName}>
    <TextInput
      label="Strategy name"
      required
      helperText="Shown across dashboards and alerts."
      placeholder="e.g. Delta-neutral basis"
    />
  </div>
);

// Disabled field is non-interactive and dimmed.
export const Disabled = () => (
  <div className={frameClassName}>
    <TextInput label="Venue" disabled defaultValue="Coinbase Prime" />
  </div>
);

// Multi-line Textarea shares the same Field frame (label/helper/error).
export const TextareaField = () => (
  <div className={frameClassName}>
    <Textarea
      label="Rebalance notes"
      helperText="Context for the next reviewer."
      rows={4}
      placeholder="Describe the intended change…"
    />
  </div>
);
