import { defineSlotRecipe } from '@pandacss/dev';

/**
 * `HeatCell`'s skin: one tile of a diverging heat/sector scale (green ↔ grey
 * ↔ red, saturation = magnitude, grey = flat), over the `colors.heat.*`
 * token family — a SEPARATE family from the categorical `chart.series.*`
 * ramp (see that family's own doc comment). Bucketed into the family's seven
 * fixed steps rather than a continuous gradient: bucketing reads more
 * reliably than interpolation at tile size, and keeps the whole scale
 * expressible as tokens instead of runtime color math.
 *
 * `step` is the only variant: each of the seven steps sets `root`'s
 * background to its `heat.*` token and picks the matching foreground
 * (`heat.fgStrong` on a saturated `neg3`/`neg2`/`pos2`/`pos3` cell,
 * `heat.fgSubtle` on a low-saturation/flat cell) for AA-legible label text
 * either way. `HeatCell` computes which step a value falls into
 * (`heatStep`); this recipe only renders whichever step it's told.
 */
export const heatCellRecipe = defineSlotRecipe({
  className: 'heatCell',
  description:
    'One tile of a diverging heat/sector scale (green<->grey<->red, saturation = magnitude, grey = flat) over the colors.heat.* token family. The step variant (seven fixed buckets) sets background + a legible foreground together.',
  slots: ['root', 'label', 'value', 'sub'],
  base: {
    root: {
      display: 'flex',
      flexDirection: 'column',
      gap: '0.5',
      minWidth: '0',
      p: '3',
      borderRadius: 'sm',
      transitionProperty: 'background-color, color',
      transitionDuration: 'fast',
    },
    label: {
      fontSize: '2xs',
      textTransform: 'uppercase',
      letterSpacing: 'wider',
      opacity: '0.85',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
    value: {
      fontSize: 'lg',
      fontWeight: 'semibold',
      fontVariantNumeric: 'tabular-nums',
    },
    sub: {
      fontSize: '2xs',
      opacity: '0.8',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    },
  },
  variants: {
    step: {
      neg3: { root: { bg: 'heat.neg3', color: 'heat.fgStrong' } },
      neg2: { root: { bg: 'heat.neg2', color: 'heat.fgStrong' } },
      neg1: { root: { bg: 'heat.neg1', color: 'heat.fgSubtle' } },
      flat: { root: { bg: 'heat.flat', color: 'heat.fgSubtle' } },
      pos1: { root: { bg: 'heat.pos1', color: 'heat.fgSubtle' } },
      pos2: { root: { bg: 'heat.pos2', color: 'heat.fgStrong' } },
      pos3: { root: { bg: 'heat.pos3', color: 'heat.fgStrong' } },
    },
  },
  defaultVariants: {
    step: 'flat',
  },
});
