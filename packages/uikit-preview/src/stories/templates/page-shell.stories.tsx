import {
  Panel,
  PageShell,
  StatRow,
  StatTile,
} from '@archon-research/design-system';

import { css } from '../../../styled-system/css';

export default {
  title: 'Templates/PageShell',
};

const canvasClassName = css({
  minHeight: '100vh',
  p: '8',
  backgroundColor: 'surface.canvas',
  fontFamily: 'sans',
  color: 'text.default',
});

const headingClassName = css({
  fontSize: 'xl',
  fontWeight: 'semibold',
  color: 'text.strong',
});

const subheadingClassName = css({
  fontSize: 'sm',
  color: 'text.muted',
  mt: '1',
});

const stackClassName = css({
  display: 'grid',
  gap: '6',
  mt: '6',
});

const bodyClassName = css({
  fontSize: 'sm',
  lineHeight: 'relaxed',
  color: 'text.muted',
});

// PageShell centres content and applies the default readable max-width.
export const Default = () => (
  <div className={canvasClassName}>
    <PageShell>
      <h1 className={headingClassName}>Portfolio overview</h1>
      <p className={subheadingClassName}>
        Centred within the default max-width, with page gutters.
      </p>
      <div className={stackClassName}>
        <StatRow>
          <StatTile label="Total AUM" value="$10.68M" sub="+2.4% 24h" />
          <StatTile label="Positions" value="18" sub="6 venues" />
          <StatTile label="Avg APY" value="4.2%" sub="net of fees" />
          <StatTile label="Idle cash" value="$412K" sub="3.9%" />
        </StatRow>
        <Panel title="Notes" surface="raised">
          <p className={bodyClassName}>
            The shell keeps line lengths comfortable regardless of viewport
            width.
          </p>
        </Panel>
      </div>
    </PageShell>
  </div>
);

// A narrower max-width via the `maxWidth` override.
export const NarrowMaxWidth = () => (
  <div className={canvasClassName}>
    <PageShell maxWidth="640px">
      <h1 className={headingClassName}>Release notes</h1>
      <p className={subheadingClassName}>maxWidth="640px"</p>
      <div className={stackClassName}>
        <Panel title="v2.4.0" surface="raised">
          <p className={bodyClassName}>
            A narrower shell suits long-form reading. The override is applied
            through the `--page-max-width` custom property.
          </p>
        </Panel>
      </div>
    </PageShell>
  </div>
);
