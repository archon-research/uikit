import { Splitter } from '@ark-ui/react/splitter';
import { Fragment, type ReactNode } from 'react';

/**
 * One pane of a `SplitLayout`.
 */
export type SplitLayoutPanel = {
  /** Stable id — also the Ark Splitter panel id, so it must be unique among siblings. */
  id: string;
  content: ReactNode;
  /**
   * Relative weight among sibling panels, renormalized to percent
   * internally (three panels sized `1, 1, 2` split 25% / 25% / 50%) — NOT
   * a percent itself. Only used to derive `defaultSize`; irrelevant once a
   * drag (or a controlled `size` prop) has set explicit sizes. Defaults to
   * `1` (an even split) when omitted.
   */
  size?: number;
  /** Percent floor while dragging. Defaults to 10 — low enough to be useful, high enough that a panel can't be dragged to an unrecoverable sliver. */
  minSize?: number;
  /** Percent ceiling while dragging. */
  maxSize?: number;
};

export type SplitLayoutProps = {
  /**
   * `'horizontal'` lays panels left-to-right with vertical drag handles
   * between them; `'vertical'` stacks them top-to-bottom with horizontal
   * handles. Nest a `SplitLayout` inside another panel's `content` to mix
   * both in one layout — N-way and nesting both fall out of ordinary React
   * composition rather than a special API.
   */
  orientation: 'horizontal' | 'vertical';
  panels: SplitLayoutPanel[];
  className?: string;
  /**
   * Controlled panel sizes (percent, one per panel, same order as
   * `panels`). Uncontrolled by default — omit this and `onResize`/
   * `onResizeEnd` to let Ark Splitter own the size internally, seeded from
   * each panel's `size` weight.
   */
  size?: number[];
  onResize?: (details: { size: number[] }) => void;
  onResizeEnd?: (details: { size: number[] }) => void;
};

const DEFAULT_MIN_SIZE = 10;

const cx = (...classes: Array<string | false | null | undefined>): string =>
  classes.filter(Boolean).join(' ');

/**
 * Renormalizes relative panel weights (`SplitLayoutPanel.size`, default `1`)
 * into percentages summing to 100 — the initial `defaultSize` Ark Splitter
 * seeds from. Pure and exported (but not re-exported from `index.ts`/the
 * package root) purely for `SplitLayout.test.ts` to exercise without
 * rendering. A non-positive or empty weight list falls back to an even
 * split across however many weights were given (guards against a `0`
 * total, e.g. every panel weighted `0`).
 */
export function deriveDefaultSizes(weights: number[]): number[] {
  if (weights.length === 0) return [];
  const total = weights.reduce((sum, weight) => sum + weight, 0);
  if (total <= 0) return weights.map(() => 100 / weights.length);
  return weights.map((weight) => (weight / total) * 100);
}

/**
 * Generic N-way resizable-panel primitive over Ark Splitter — the same
 * primitive `SidebarLayout` is built on, generalized past its fixed
 * sidebar/main/bottom-panel shape. Renders however many panels it's given
 * in one orientation, each separated by a drag handle; nest one
 * `SplitLayout` inside another's panel to build a mixed row/column layout
 * (a horizontal split whose right panel is itself a vertical split, etc.).
 *
 * Sizing is a two-tier API, mirroring `useDataTable`'s controlled/
 * uncontrolled pattern: each `SplitLayoutPanel.size` is a relative weight
 * used ONLY to derive the initial split (so `[{ size: 1 }, { size: 2 }]`
 * starts at 33%/67%); pass `size`/`onResize`/`onResizeEnd` to fully control
 * the live percentages yourself (e.g. to persist them), or leave them out
 * and let Ark Splitter own the size after the initial render.
 */
export function SplitLayout({
  orientation,
  panels,
  className,
  size,
  onResize,
  onResizeEnd,
}: SplitLayoutProps) {
  const defaultSize = deriveDefaultSizes(
    panels.map((panel) => panel.size ?? 1),
  );

  const arkPanels = panels.map((panel) => ({
    id: panel.id,
    minSize: panel.minSize ?? DEFAULT_MIN_SIZE,
    maxSize: panel.maxSize,
  }));

  return (
    <Splitter.Root
      orientation={orientation}
      panels={arkPanels}
      size={size}
      defaultSize={size ? undefined : defaultSize}
      onResize={onResize}
      onResizeEnd={onResizeEnd}
      className={cx('splitLayout__root', className)}
    >
      {panels.map((panel, index) => (
        <Fragment key={panel.id}>
          {index > 0 ? (
            <Splitter.ResizeTrigger
              id={`${panels[index - 1]!.id}:${panel.id}`}
              aria-label={`Resize panel ${index}`}
              className="splitLayout__resizeTrigger"
              data-scope="resize-handle"
              data-part="root"
              data-axis={
                orientation === 'horizontal' ? 'vertical' : 'horizontal'
              }
              data-placement="overlay"
              data-resize-source="splitter"
            >
              <Splitter.ResizeTriggerIndicator
                className="splitLayout__resizeTriggerIndicator"
                data-scope="resize-handle"
                data-part="indicator"
              />
            </Splitter.ResizeTrigger>
          ) : null}
          <Splitter.Panel id={panel.id} className="splitLayout__panel">
            {panel.content}
          </Splitter.Panel>
        </Fragment>
      ))}
    </Splitter.Root>
  );
}
