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

// `titleSize` controls the section-label size: `md` (12px, default) or `sm`
// (11px) for tighter, information-dense panels. Weight and tracking are held
// consistent across both sizes.
export const TitleSize = () => (
  <div className={frameClassName}>
    <Panel title="Default title" titleSize="md" meta="titleSize='md' (default)">
      <p className={bodyClassName}>Section label at the default 12px size.</p>
    </Panel>
    <Panel title="Smaller title" titleSize="sm" meta="titleSize='sm'">
      <p className={bodyClassName}>
        Section label one step smaller at 11px for dense layouts.
      </p>
    </Panel>
  </div>
);

// The header row keeps the title on the left and aligns the meta line plus
// trailing actions inline at the end of the same row.
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
        The meta line sits inline at the end of the title row, with actions
        aligned to the right of the same row.
      </p>
    </Panel>
    <Panel title="Positions" meta="18 across 6 venues">
      <p className={bodyClassName}>
        With no actions, the meta line still sits inline at the end of the title
        row.
      </p>
    </Panel>
  </div>
);

// Compact density tightens internal padding only; the meta line size is a
// separate `metaSize` control.
export const Density = () => (
  <div className={frameClassName}>
    <Panel title="Normal density" density="normal" surface="raised">
      <p className={bodyClassName}>density="normal" (default) · p-4 padding.</p>
    </Panel>
    <Panel title="Compact density" density="compact" surface="raised">
      <p className={bodyClassName}>density="compact" · p-3 padding.</p>
    </Panel>
    <p className={captionClassName}>
      density controls the section padding only. Meta line size is separate (see
      MetaSize), so a roomy panel can still carry a small meta line.
    </p>
  </div>
);

export const MetaSize = () => (
  <div className={frameClassName}>
    <Panel
      title="Default meta"
      metaSize="md"
      meta="4 pending transfers · updated 2m ago"
    >
      <p className={bodyClassName}>metaSize="md" (default) · 14px meta.</p>
    </Panel>
    <Panel
      title="Small meta"
      metaSize="sm"
      meta="4 pending transfers · updated 2m ago"
    >
      <p className={bodyClassName}>metaSize="sm" · ~11px meta.</p>
    </Panel>
    <p className={captionClassName}>
      metaSize sizes the meta line independently of density.
    </p>
  </div>
);

// A leading-edge accent stripe carries state as a few pixels of color (mirrors
// StatTile's accent). `accentColor` supplies a runtime hue, e.g. an instrument.
export const Accent = () => (
  <div className={frameClassName}>
    <Panel accent="success" title="Within limits" meta="all checks green">
      <p className={bodyClassName}>accent="success"</p>
    </Panel>
    <Panel accent="warning" title="Approaching limit" meta="82% of cap">
      <p className={bodyClassName}>accent="warning"</p>
    </Panel>
    <Panel accent="critical" title="Breached" meta="over cap">
      <p className={bodyClassName}>accent="critical"</p>
    </Panel>
    <Panel accentColor="var(--colors-chart-series-tertiary)" title="ETH-USD">
      <p className={bodyClassName}>
        accentColor="…" — a runtime hue (e.g. an instrument identity color).
      </p>
    </Panel>
  </div>
);

// `radius` reads a token (default md); `headerWrap` lets a long header wrap
// instead of forcing the panel wider.
export const RadiusAndHeaderWrap = () => (
  <div className={frameClassName}>
    <Panel radius="none" title="radius=none">
      <p className={bodyClassName}>Squared frame.</p>
    </Panel>
    <Panel radius="lg" title="radius=lg">
      <p className={bodyClassName}>Softer corners.</p>
    </Panel>
    <div className={css({ maxWidth: '320px' })}>
      <Panel
        headerWrap
        title="A deliberately long section heading that must wrap"
        meta="updated 2m ago · 4 pending"
      >
        <p className={bodyClassName}>
          headerWrap + min-width:0 on the meta slot keep the header inside
          320px.
        </p>
      </Panel>
    </div>
  </div>
);
