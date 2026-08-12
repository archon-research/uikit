import { defineSlotRecipe } from '@pandacss/dev';

/**
 * `meter` slot recipe: a measurement inside a range, distinct from Ark
 * `Progress` (a task advancing to completion). The fill and any markers are
 * positioned at runtime by the component with inline width/left (a percentage
 * Panda cannot statically extract), so consumers stop hand-rolling the
 * track/fill/marker styling. `tone` sets the fill hue via dark-aware
 * `colorPalette` role tokens.
 *
 * The design-system builds with `tsc` and ships no generated `styled-system`,
 * so the component applies this recipe by its stable slot class names
 * (`meter__root`, `meter__track`, …, variant `meter__root--tone_x`). Registered
 * in the preset + staticCss.
 */
export const meterRecipe = defineSlotRecipe({
  className: 'meter',
  description:
    'Range measurement (role=meter) with an optional limit marker inside the range. Fill/marker positions are set at runtime by the component; tone sets the fill hue via colorPalette role tokens.',
  slots: [
    'root',
    'header',
    'label',
    'valueText',
    'track',
    'fill',
    'marker',
    'scale',
    'scaleBound',
    'scaleMark',
    'footer',
  ],
  base: {
    root: {
      display: 'grid',
      gap: '1.5',
      minWidth: '0',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      gap: '2',
    },
    label: {
      textStyle: 'sectionLabel',
      color: 'text.muted',
    },
    valueText: {
      textStyle: 'figure',
      fontSize: 'sm',
      color: 'text.strong',
    },
    track: {
      position: 'relative',
      width: 'full',
      height: '2',
      borderRadius: 'full',
      bg: 'surface.subtle',
    },
    fill: {
      position: 'absolute',
      insetBlock: '0',
      insetInlineStart: '0',
      borderRadius: 'full',
      bg: 'colorPalette.solid.bg',
      // width is set inline by the component (runtime percentage).
    },
    marker: {
      position: 'absolute',
      insetBlock: '-1px',
      width: '2px',
      borderRadius: 'full',
      bg: 'text.strong',
      transform: 'translateX(-50%)',
      // insetInlineStart (position) is set inline by the component.
    },
    // Scale row beneath the track: min/max bounds at the ends, marker labels
    // positioned at their value. `position: relative` anchors the absolutely
    // positioned marks; the bounds sit at the flow ends.
    scale: {
      position: 'relative',
      display: 'flex',
      justifyContent: 'space-between',
      textStyle: 'metaText',
      color: 'text.muted',
    },
    scaleBound: {
      whiteSpace: 'nowrap',
    },
    scaleMark: {
      position: 'absolute',
      transform: 'translateX(-50%)',
      whiteSpace: 'nowrap',
      // insetInlineStart (position) is set inline by the component.
    },
    footer: {
      textStyle: 'metaText',
      color: 'text.muted',
    },
  },
  variants: {
    tone: {
      neutral: { root: { colorPalette: 'neutral' } },
      success: { root: { colorPalette: 'green' } },
      warning: { root: { colorPalette: 'amber' } },
      critical: { root: { colorPalette: 'red' } },
    },
  },
  defaultVariants: {
    tone: 'neutral',
  },
});

/**
 * `proportionBar` slot recipe: a single stacked bar of labelled shares plus a
 * legend. Segment widths and swatch/segment colors are set at runtime by the
 * component (inline), so consumers stop writing inline styles to dodge Panda's
 * build-time extraction. Registered in the preset + staticCss.
 */
export const proportionBarRecipe = defineSlotRecipe({
  className: 'proportionBar',
  description:
    'Stacked bar of labelled proportions with a legend and an optional visually-hidden table mirror. Segment widths/colors are set at runtime by the component.',
  slots: [
    'root',
    'track',
    'segment',
    'legend',
    'legendItem',
    'swatch',
    'legendLabel',
    'legendValue',
  ],
  base: {
    root: {
      display: 'grid',
      gap: '2',
      minWidth: '0',
    },
    track: {
      display: 'flex',
      width: 'full',
      height: '2.5',
      borderRadius: 'full',
      overflow: 'hidden',
      bg: 'surface.subtle',
    },
    segment: {
      height: 'full',
      minWidth: '0',
      // width + background are set inline by the component.
    },
    legend: {
      display: 'flex',
      flexWrap: 'wrap',
      gap: '3',
    },
    legendItem: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '1.5',
      fontSize: 'xs',
      color: 'text.muted',
    },
    swatch: {
      width: '2.5',
      height: '2.5',
      borderRadius: 'sm',
      flexShrink: '0',
      // background is set inline by the component.
    },
    legendLabel: {
      color: 'text.default',
    },
    legendValue: {
      textStyle: 'figure',
      color: 'text.strong',
    },
  },
});

/**
 * `proportionList` slot recipe: N labelled bars on a common baseline (each row a
 * label + value line above its own track), distinct from `proportionBar`'s
 * single stacked bar. For a set of independent shares/weights/allocations, with
 * an optional visually-hidden table mirror. Bar widths/colors are set at runtime
 * by the component. Registered in the preset + staticCss.
 */
export const proportionListRecipe = defineSlotRecipe({
  className: 'proportionList',
  description:
    'A list of labelled bars on a common baseline (one track per row) for independent shares, with an optional visually-hidden table mirror. Bar widths/colors are set at runtime by the component.',
  slots: ['root', 'row', 'header', 'label', 'value', 'track', 'fill'],
  base: {
    root: {
      display: 'grid',
      gap: '2.5',
      minWidth: '0',
    },
    row: {
      display: 'grid',
      gap: '1',
      minWidth: '0',
    },
    header: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      gap: '2',
      fontSize: 'xs',
    },
    label: {
      color: 'text.default',
      minWidth: '0',
    },
    value: {
      textStyle: 'figure',
      color: 'text.strong',
    },
    track: {
      position: 'relative',
      width: 'full',
      height: '2',
      borderRadius: 'full',
      bg: 'surface.subtle',
      overflow: 'hidden',
    },
    fill: {
      position: 'absolute',
      insetBlock: '0',
      insetInlineStart: '0',
      borderRadius: 'full',
      // width + background are set inline by the component.
    },
  },
});
