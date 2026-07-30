import { Splitter } from '@ark-ui/react/splitter';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

type SidebarLayoutProps = {
  sidebar: ReactNode;
  main: ReactNode;
  topBar?: ReactNode;
  bottomPanel?: ReactNode;
  className?: string;
  defaultSidebarWidth?: number;
  minSidebarWidth?: number;
  maxSidebarWidth?: number;
  defaultBottomPanelHeight?: number;
  minBottomPanelHeight?: number;
  maxBottomPanelHeight?: number;
  sidebarStorageKey?: string;
  bottomPanelStorageKey?: string;
  /**
   * Below this root width (px), collapse the resizable split into a single
   * scrolling column (sidebar stacked above main). Omit to keep the split
   * layout at every width. Resizing is disabled while stacked.
   */
  collapseBelow?: number;
};

const DEFAULT_SIDEBAR_WIDTH = 320;
const DEFAULT_MIN_SIDEBAR_WIDTH = 200;
const DEFAULT_MAX_SIDEBAR_WIDTH = 600;

const DEFAULT_BOTTOM_HEIGHT = 280;
const DEFAULT_MIN_BOTTOM_HEIGHT = 120;
const DEFAULT_MAX_BOTTOM_HEIGHT = 600;
const TOP_BAR_MIN_HEIGHT = 64;

const SIDEBAR_STORAGE_KEY = 'sidebar-width';
const BOTTOM_STORAGE_KEY = 'bottom-panel-height';

/**
 * Class names emitted by the `sidebarLayout` slot recipe (registered in the
 * preset + staticCss). The design-system package builds with `tsc` and ships no
 * generated `styled-system`, so styling is applied by stable Panda slot class
 * names (`${className}__${slot}`). All surfaces, borders, and resize indicators
 * — previously inline `var(--colors-*)` styles — now live in the recipe, so a
 * consumer `className` composed LAST on `root` (utilities layer) overrides them
 *. Runtime panel sizing still comes from Ark Splitter props.
 */
const slots = {
  root: 'sidebarLayout__root',
  horizontalSplitter: 'sidebarLayout__horizontalSplitter',
  sidebar: 'sidebarLayout__sidebar',
  main: 'sidebarLayout__main',
  topBar: 'sidebarLayout__topBar',
  mainColumn: 'sidebarLayout__mainColumn',
  content: 'sidebarLayout__content',
  verticalSplitter: 'sidebarLayout__verticalSplitter',
  contentPanel: 'sidebarLayout__contentPanel',
  bottomPanel: 'sidebarLayout__bottomPanel',
  verticalResizeTrigger: 'sidebarLayout__verticalResizeTrigger',
  horizontalResizeTrigger: 'sidebarLayout__horizontalResizeTrigger',
  verticalResizeIndicator: 'sidebarLayout__verticalResizeIndicator',
  horizontalResizeIndicator: 'sidebarLayout__horizontalResizeIndicator',
} as const;

const cx = (...classes: Array<string | false | null | undefined>): string =>
  classes.filter(Boolean).join(' ');

function isBrowser(): boolean {
  return typeof window !== 'undefined';
}

function readNumberFromStorage(key: string, fallback: number): number {
  if (!isBrowser()) {
    return fallback;
  }

  const stored = window.localStorage.getItem(key);
  if (!stored) {
    return fallback;
  }

  const parsed = Number(stored);
  if (Number.isNaN(parsed)) {
    return fallback;
  }

  return parsed;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function toPercent(value: number, total: number): number {
  if (total <= 0) {
    return 0;
  }

  return (value / total) * 100;
}

function toPixels(value: number, total: number): number {
  return (value / 100) * total;
}

export function SidebarLayout({
  sidebar,
  main,
  topBar,
  bottomPanel,
  className,
  defaultSidebarWidth = DEFAULT_SIDEBAR_WIDTH,
  minSidebarWidth = DEFAULT_MIN_SIDEBAR_WIDTH,
  maxSidebarWidth = DEFAULT_MAX_SIDEBAR_WIDTH,
  defaultBottomPanelHeight = DEFAULT_BOTTOM_HEIGHT,
  minBottomPanelHeight = DEFAULT_MIN_BOTTOM_HEIGHT,
  maxBottomPanelHeight = DEFAULT_MAX_BOTTOM_HEIGHT,
  sidebarStorageKey = SIDEBAR_STORAGE_KEY,
  bottomPanelStorageKey = BOTTOM_STORAGE_KEY,
  collapseBelow,
}: SidebarLayoutProps) {
  const rootRef = useRef<HTMLDivElement>(null);
  const mainColumnRef = useRef<HTMLDivElement>(null);

  const [sidebarWidth, setSidebarWidth] = useState(() =>
    clamp(
      readNumberFromStorage(sidebarStorageKey, defaultSidebarWidth),
      minSidebarWidth,
      maxSidebarWidth,
    ),
  );

  const [bottomPanelHeight, setBottomPanelHeight] = useState(() =>
    clamp(
      readNumberFromStorage(bottomPanelStorageKey, defaultBottomPanelHeight),
      minBottomPanelHeight,
      maxBottomPanelHeight,
    ),
  );

  const [rootWidth, setRootWidth] = useState(() =>
    isBrowser() ? window.innerWidth : 1280,
  );

  const [mainColumnHeight, setMainColumnHeight] = useState(() =>
    isBrowser() ? window.innerHeight : 720,
  );

  useEffect(() => {
    if (!isBrowser()) {
      return;
    }

    const updateRootWidth = () => {
      const measured = rootRef.current?.clientWidth ?? 0;
      setRootWidth(measured > 0 ? measured : window.innerWidth);
    };

    updateRootWidth();

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(updateRootWidth)
        : null;

    if (resizeObserver && rootRef.current) {
      resizeObserver.observe(rootRef.current);
    }

    window.addEventListener('resize', updateRootWidth);

    return () => {
      window.removeEventListener('resize', updateRootWidth);
      resizeObserver?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (!isBrowser()) {
      return;
    }

    const updateMainColumnHeight = () => {
      const measured = mainColumnRef.current?.clientHeight ?? 0;
      const fallback = topBar
        ? window.innerHeight - TOP_BAR_MIN_HEIGHT
        : window.innerHeight;
      setMainColumnHeight(measured > 0 ? measured : fallback);
    };

    updateMainColumnHeight();

    const resizeObserver =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(updateMainColumnHeight)
        : null;

    if (resizeObserver && mainColumnRef.current) {
      resizeObserver.observe(mainColumnRef.current);
    }

    window.addEventListener('resize', updateMainColumnHeight);

    return () => {
      window.removeEventListener('resize', updateMainColumnHeight);
      resizeObserver?.disconnect();
    };
  }, [topBar]);

  const safeRootWidth = Math.max(rootWidth, 1);
  const safeMainColumnHeight = Math.max(mainColumnHeight, 1);

  const sidebarWidthClamped = clamp(
    sidebarWidth,
    minSidebarWidth,
    maxSidebarWidth,
  );
  const bottomPanelHeightClamped = clamp(
    bottomPanelHeight,
    minBottomPanelHeight,
    maxBottomPanelHeight,
  );

  const sidebarPanelMin = toPercent(minSidebarWidth, safeRootWidth);
  const sidebarPanelMax = toPercent(maxSidebarWidth, safeRootWidth);
  const sidebarPanelSize = toPercent(sidebarWidthClamped, safeRootWidth);

  const bottomPanelMin = toPercent(minBottomPanelHeight, safeMainColumnHeight);
  const bottomPanelMax = toPercent(maxBottomPanelHeight, safeMainColumnHeight);
  const bottomPanelSize = toPercent(
    bottomPanelHeightClamped,
    safeMainColumnHeight,
  );

  const horizontalPanels = useMemo(
    () => [
      {
        id: 'sidebar',
        minSize: sidebarPanelMin,
        maxSize: sidebarPanelMax,
      },
      {
        id: 'main',
        minSize: Math.max(0, 100 - sidebarPanelMax),
        maxSize: Math.max(0, 100 - sidebarPanelMin),
      },
    ],
    [sidebarPanelMax, sidebarPanelMin],
  );

  const stacked = collapseBelow != null && rootWidth < collapseBelow;

  // Narrow-width fallback: a single scrolling column with no Splitter, so Ark's
  // inline flex-basis sizing never applies. `rootRef` stays attached so the
  // width keeps being measured and the layout switches back when widened.
  if (stacked) {
    const stackedOf = (slot: string): string => `${slot}--layout_stacked`;
    return (
      <div
        ref={rootRef}
        className={cx(slots.root, stackedOf(slots.root), className)}
      >
        <div
          className={cx(
            slots.horizontalSplitter,
            stackedOf(slots.horizontalSplitter),
          )}
        >
          <div className={cx(slots.sidebar, stackedOf(slots.sidebar))}>
            {sidebar}
          </div>
          <div className={cx(slots.main, stackedOf(slots.main))}>
            {topBar ? <header className={slots.topBar}>{topBar}</header> : null}
            <div
              ref={mainColumnRef}
              className={cx(slots.mainColumn, stackedOf(slots.mainColumn))}
            >
              <div className={cx(slots.content, stackedOf(slots.content))}>
                {main}
              </div>
              {bottomPanel ? (
                <div className={slots.bottomPanel}>{bottomPanel}</div>
              ) : null}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div ref={rootRef} className={cx(slots.root, className)}>
      <Splitter.Root
        orientation="horizontal"
        panels={horizontalPanels}
        defaultSize={[sidebarPanelSize, 100 - sidebarPanelSize]}
        className={slots.horizontalSplitter}
        onResizeEnd={({ size }) => {
          const nextSidebar = clamp(
            toPixels(size[0] ?? sidebarPanelSize, safeRootWidth),
            minSidebarWidth,
            maxSidebarWidth,
          );

          setSidebarWidth(nextSidebar);
          if (isBrowser()) {
            window.localStorage.setItem(sidebarStorageKey, String(nextSidebar));
          }
        }}
      >
        <Splitter.Panel id="sidebar" className={slots.sidebar}>
          {sidebar}
        </Splitter.Panel>

        <Splitter.ResizeTrigger
          id="sidebar:main"
          aria-label="Resize sidebar"
          className={slots.verticalResizeTrigger}
          data-scope="resize-handle"
          data-part="root"
          data-axis="vertical"
          data-placement="overlay"
          data-resize-source="splitter"
        >
          <Splitter.ResizeTriggerIndicator
            className={slots.verticalResizeIndicator}
            data-scope="resize-handle"
            data-part="indicator"
          />
        </Splitter.ResizeTrigger>

        <Splitter.Panel id="main" className={slots.main}>
          {topBar ? <header className={slots.topBar}>{topBar}</header> : null}

          <div ref={mainColumnRef} className={slots.mainColumn}>
            {bottomPanel ? (
              <Splitter.Root
                orientation="vertical"
                panels={[
                  {
                    id: 'content',
                    minSize: Math.max(0, 100 - bottomPanelMax),
                    maxSize: Math.max(0, 100 - bottomPanelMin),
                    order: 0,
                  },
                  {
                    id: 'bottom',
                    minSize: bottomPanelMin,
                    maxSize: bottomPanelMax,
                    order: 1,
                  },
                ]}
                defaultSize={[100 - bottomPanelSize, bottomPanelSize]}
                className={slots.verticalSplitter}
                onResizeEnd={({ size }) => {
                  const nextBottom = clamp(
                    toPixels(size[1] ?? bottomPanelSize, safeMainColumnHeight),
                    minBottomPanelHeight,
                    maxBottomPanelHeight,
                  );

                  setBottomPanelHeight(nextBottom);
                  if (isBrowser()) {
                    window.localStorage.setItem(
                      bottomPanelStorageKey,
                      String(nextBottom),
                    );
                  }
                }}
              >
                <Splitter.Panel id="content" className={slots.contentPanel}>
                  {main}
                </Splitter.Panel>

                <Splitter.ResizeTrigger
                  id="content:bottom"
                  aria-label="Resize bottom panel"
                  className={slots.horizontalResizeTrigger}
                  data-scope="resize-handle"
                  data-part="root"
                  data-axis="horizontal"
                  data-placement="overlay"
                  data-resize-source="splitter"
                >
                  <Splitter.ResizeTriggerIndicator
                    className={slots.horizontalResizeIndicator}
                    data-scope="resize-handle"
                    data-part="indicator"
                  />
                </Splitter.ResizeTrigger>

                <Splitter.Panel id="bottom" className={slots.bottomPanel}>
                  {bottomPanel}
                </Splitter.Panel>
              </Splitter.Root>
            ) : (
              <div className={slots.content}>{main}</div>
            )}
          </div>
        </Splitter.Panel>
      </Splitter.Root>
    </div>
  );
}

export type { SidebarLayoutProps };
