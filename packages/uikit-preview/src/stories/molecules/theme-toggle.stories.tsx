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

const pillClassName = css({
  alignItems: 'center',
  bg: 'surface.subtle',
  border: '1px solid',
  borderColor: 'border.subtle',
  borderRadius: 'lg',
  display: 'inline-flex',
  gap: '1',
  p: '1',
});

/**
 * `appearance="bare"` drops the icon button's own border, background, and
 * radius so it inherits an enclosing toolbar or pill surface instead of
 * double-drawing a chip inside it. The default `chip` appearance is shown
 * first for contrast.
 */
export const IconBare = () => (
  <ThemeProvider>
    <div className={rowClassName}>
      <div className={pillClassName}>
        <ThemeToggle variant="icon" appearance="chip" />
      </div>
      <div className={pillClassName}>
        <ThemeToggle variant="icon" appearance="bare" />
      </div>
    </div>
  </ThemeProvider>
);
