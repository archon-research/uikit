import { Badge, Button, Panel } from '@archon-research/design-system';

import { css } from '../../../styled-system/css';

export default {
  title: 'Molecules/Panel',
};

const frameClassName = css({
  display: 'grid',
  gap: '6',
  p: '6',
  backgroundColor: 'surface.canvas',
  fontFamily: 'sans',
  color: 'text.default',
});

const captionClassName = css({
  fontSize: 'sm',
  color: 'text.muted',
});

const bodyClassName = css({
  fontSize: 'sm',
  lineHeight: 'relaxed',
  color: 'text.muted',
});

const SURFACES = ['canvas', 'raised', 'recessed'] as const;

// Panel is a raised container by default; the three surface steps let it sit on
// canvas, lift above it, or recess into it.
export const Surfaces = () => (
  <div className={frameClassName}>
    {SURFACES.map((surface) => (
      <Panel
        key={surface}
        surface={surface}
        title={`surface="${surface}"`}
        meta="Portfolio exposure across active venues"
      >
        <p className={bodyClassName}>
          A panel groups related content under a section heading. The surface
          step controls how it separates from the page background.
        </p>
      </Panel>
    ))}
  </div>
);

// `titleTransform="upper"` renders the heading as a wider-tracked micro-label.
export const TitleTransform = () => (
  <div className={frameClassName}>
    <Panel title="Default title" meta="titleTransform='none' (default)">
      <p className={bodyClassName}>Sentence-case section heading.</p>
    </Panel>
    <Panel
      title="Uppercase title"
      titleTransform="upper"
      meta="titleTransform='upper'"
    >
      <p className={bodyClassName}>Uppercase, wider-tracked micro-label.</p>
    </Panel>
  </div>
);

// The header row composes a meta line plus trailing actions.
export const WithMetaAndActions = () => (
  <div className={frameClassName}>
    <Panel
      title="Rebalance queue"
      meta="4 pending transfers · updated 2m ago"
      actions={
        <>
          <Badge colorPalette="amber">Needs review</Badge>
          <Button size="sm">Approve all</Button>
        </>
      }
    >
      <p className={bodyClassName}>
        Actions align to the end of the header row; the meta line sits beneath
        the title.
      </p>
    </Panel>
  </div>
);

// Compact density tightens internal padding for dense dashboards.
export const Density = () => (
  <div className={frameClassName}>
    <Panel title="Normal density" density="normal" surface="raised">
      <p className={bodyClassName}>density="normal" (default).</p>
    </Panel>
    <Panel title="Compact density" density="compact" surface="raised">
      <p className={bodyClassName}>density="compact".</p>
    </Panel>
    <p className={captionClassName}>
      Compact reduces the section padding for information-dense layouts.
    </p>
  </div>
);
