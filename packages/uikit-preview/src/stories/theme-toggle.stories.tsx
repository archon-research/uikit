import { ThemeProvider, ThemeToggle } from '@archon-research/design-system';

import { css } from '../../styled-system/css';

export default {
  title: 'Components/Theme Toggle',
};

const storyFrameClassName = css({
  alignItems: 'center',
  bg: 'surface.default',
  display: 'flex',
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
