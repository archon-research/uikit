import {
  Button,
  Panel,
  SidebarGrid,
  StatRow,
  StatTile,
} from '@archon-research/design-system';

import { css } from '../../../styled-system/css';

export default {
  title: 'Templates/SidebarGrid',
};

const canvasClassName = css({
  minHeight: '100vh',
  p: '6',
  backgroundColor: 'surface.canvas',
  fontFamily: 'sans',
  color: 'text.default',
});

const railClassName = css({
  display: 'grid',
  gap: '1',
  alignContent: 'start',
});

const railHeadingClassName = css({
  fontSize: 'xs',
  fontWeight: 'semibold',
  textTransform: 'uppercase',
  letterSpacing: 'wide',
  color: 'text.muted',
  px: '2',
  py: '1',
});

const mainClassName = css({
  display: 'grid',
  gap: '6',
});

const bodyClassName = css({
  fontSize: 'sm',
  lineHeight: 'relaxed',
  color: 'text.muted',
});

const NAV_ITEMS = ['Overview', 'Positions', 'Rebalance', 'Alerts', 'Settings'];

const Rail = () => (
  <nav className={railClassName}>
    <div className={railHeadingClassName}>Navigation</div>
    {NAV_ITEMS.map((item, index) => (
      <Button
        key={item}
        variant="item"
        selected={index === 0}
        style={{ justifyContent: 'flex-start' }}
      >
        {item}
      </Button>
    ))}
  </nav>
);

const Main = () => (
  <div className={mainClassName}>
    <StatRow>
      <StatTile label="Total AUM" value="$10.68M" sub="+2.4% 24h" />
      <StatTile label="Positions" value="18" sub="6 venues" />
      <StatTile label="Avg APY" value="4.2%" sub="net of fees" />
    </StatRow>
    <Panel
      title="Overview"
      meta="Non-resizable rail + main region"
      surface="raised"
    >
      <p className={bodyClassName}>
        SidebarGrid pairs a fixed-width rail with a fluid main column. The rail
        collapses to a single column below the md breakpoint.
      </p>
    </Panel>
  </div>
);

// Default 250px rail width.
export const Default = () => (
  <div className={canvasClassName}>
    <SidebarGrid sidebar={<Rail />} main={<Main />} />
  </div>
);

// A wider rail via the `sidebarWidth` override.
export const WideRail = () => (
  <div className={canvasClassName}>
    <SidebarGrid sidebarWidth="320px" sidebar={<Rail />} main={<Main />} />
  </div>
);
