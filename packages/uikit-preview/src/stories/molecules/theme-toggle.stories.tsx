import { ThemeProvider, ThemeToggle } from '@archon-research/design-system';

import { css } from '../../../styled-system/css';

export default {
  title: 'Molecules/Theme Toggle',
};

const storyFrameClassName = css({
  alignItems: 'center',
  bg: 'surface.default',
  display: 'flex',
  minHeight: '40',
  p: '6',
});

const rowClassName = css({
  alignItems: 'center',
  bg: 'surface.default',
  display: 'flex',
  gap: '4',
  minHeight: '40',
  p: '6',
});

export const Default = () => (
  <ThemeProvider>
    <div className={storyFrameClassName}>
      <ThemeToggle />
    </div>
  </ThemeProvider>
);

/**
 * a compact single-button form that cycles auto -> light -> dark.
 * The default segmented form stays available via `variant="segmented"`.
 */
export const Icon = () => (
  <ThemeProvider>
    <div className={rowClassName}>
      <ThemeToggle variant="icon" />
      <ThemeToggle variant="segmented" />
    </div>
  </ThemeProvider>
);
