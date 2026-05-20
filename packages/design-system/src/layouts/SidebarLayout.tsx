import { Splitter } from '@ark-ui/react/splitter';
import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';

type SidebarLayoutProps = {
  sidebar: ReactNode;
  main: ReactNode;
  topBar?: ReactNode;
  bottomPanel?: ReactNode;
  defaultSidebarWidth?: number;
  minSidebarWidth?: number;
  maxSidebarWidth?: number;
  defaultBottomPanelHeight?: number;
  minBottomPanelHeight?: number;
  maxBottomPanelHeight?: number;
  sidebarStorageKey?: string;
  bottomPanelStorageKey?: string;
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

const rootStyle: CSSProperties = {
  width: '100%',
  height: '100vh',
  minWidth: 0,
  overflow: 'hidden',
};

const horizontalSplitterStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  minWidth: 0,
  minHeight: 0,
};

const sidebarBaseStyle: CSSProperties = {
  minWidth: 0,
  minHeight: 0,
  overflow: 'auto',
  borderRight: '1px solid var(--colors-border-subtle, #d0d5dd)',
  background: 'var(--colors-surface-default, #ffffff)',
};

const mainStyle: CSSProperties = {
  minWidth: 0,
  minHeight: 0,
  height: '100%',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
};

const topBarStyle: CSSProperties = {
  padding: '12px 16px',
  borderBottom: '1px solid var(--colors-border-subtle, #d0d5dd)',
  background: 'var(--colors-surface-default, #ffffff)',
  display: 'flex',
  justifyContent: 'flex-end',
  alignItems: 'center',
  minHeight: TOP_BAR_MIN_HEIGHT,
};

const contentStyle: CSSProperties = {
  minWidth: 0,
  minHeight: 0,
  flex: 1,
  overflow: 'auto',
};

const mainColumnStyle: CSSProperties = {
  minWidth: 0,
  minHeight: 0,
  flex: 1,
  overflow: 'hidden',
};

const verticalSplitterStyle: CSSProperties = {
  width: '100%',
  height: '100%',
  display: 'flex',
  flexDirection: 'column',
  minWidth: 0,
  minHeight: 0,
};

const bottomPanelStyle: CSSProperties = {
  background: 'var(--colors-surface-default, #ffffff)',
  borderTop: '1px solid var(--colors-border-subtle, #d0d5dd)',
  overflow: 'auto',
  minHeight: 0,
};

const verticalResizeTriggerStyle: CSSProperties = {
  position: 'relative',
  width: 8,
  marginLeft: -4,
  marginRight: -4,
  background: 'transparent',
  border: 'none',
  padding: 0,
  cursor: 'col-resize',
  zIndex: 1,
};

const horizontalResizeTriggerStyle: CSSProperties = {
  position: 'relative',
  height: 8,
  marginTop: -4,
  marginBottom: -4,
  background: 'transparent',
  border: 'none',
  padding: 0,
  cursor: 'row-resize',
  zIndex: 1,
};

const verticalResizeIndicatorStyle: CSSProperties = {
  position: 'absolute',
  top: 0,
  bottom: 0,
  left: '50%',
  width: 1,
  transform: 'translateX(-50%)',
  background: 'var(--colors-border-subtle, #d0d5dd)',
};

const horizontalResizeIndicatorStyle: CSSProperties = {
  position: 'absolute',
  left: 0,
  right: 0,
  top: '50%',
  height: 1,
  transform: 'translateY(-50%)',
  background: 'var(--colors-border-subtle, #d0d5dd)',
};

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
  defaultSidebarWidth = DEFAULT_SIDEBAR_WIDTH,
  minSidebarWidth = DEFAULT_MIN_SIDEBAR_WIDTH,
  maxSidebarWidth = DEFAULT_MAX_SIDEBAR_WIDTH,
  defaultBottomPanelHeight = DEFAULT_BOTTOM_HEIGHT,
  minBottomPanelHeight = DEFAULT_MIN_BOTTOM_HEIGHT,
  maxBottomPanelHeight = DEFAULT_MAX_BOTTOM_HEIGHT,
  sidebarStorageKey = SIDEBAR_STORAGE_KEY,
  bottomPanelStorageKey = BOTTOM_STORAGE_KEY,
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
      setMainColumnHeight(
        measured > 0 ? measured : fallback,
      );
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

  const sidebarWidthClamped = clamp(sidebarWidth, minSidebarWidth, maxSidebarWidth);
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
  const bottomPanelSize = toPercent(bottomPanelHeightClamped, safeMainColumnHeight);

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

  return (
    <div ref={rootRef} style={rootStyle}>
      <Splitter.Root
        orientation="horizontal"
        panels={horizontalPanels}
        size={[sidebarPanelSize, 100 - sidebarPanelSize]}
        style={horizontalSplitterStyle}
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
        <Splitter.Panel id="sidebar" style={sidebarBaseStyle}>
          {sidebar}
        </Splitter.Panel>

        <Splitter.ResizeTrigger
          id="sidebar:main"
          aria-label="Resize sidebar"
          style={verticalResizeTriggerStyle}
          data-scope="resize-handle"
          data-part="root"
          data-axis="vertical"
          data-placement="overlay"
          data-resize-source="splitter"
        >
          <Splitter.ResizeTriggerIndicator
            style={verticalResizeIndicatorStyle}
            data-scope="resize-handle"
            data-part="indicator"
          />
        </Splitter.ResizeTrigger>

        <Splitter.Panel id="main" style={mainStyle}>
          {topBar ? <header style={topBarStyle}>{topBar}</header> : null}

          <div ref={mainColumnRef} style={mainColumnStyle}>
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
                size={[100 - bottomPanelSize, bottomPanelSize]}
                style={verticalSplitterStyle}
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
                <Splitter.Panel id="content" style={contentStyle}>
                  {main}
                </Splitter.Panel>

                <Splitter.ResizeTrigger
                  id="content:bottom"
                  aria-label="Resize bottom panel"
                  style={horizontalResizeTriggerStyle}
                  data-scope="resize-handle"
                  data-part="root"
                  data-axis="horizontal"
                  data-placement="overlay"
                  data-resize-source="splitter"
                >
                  <Splitter.ResizeTriggerIndicator
                    style={horizontalResizeIndicatorStyle}
                    data-scope="resize-handle"
                    data-part="indicator"
                  />
                </Splitter.ResizeTrigger>

                <Splitter.Panel id="bottom" style={bottomPanelStyle}>
                  {bottomPanel}
                </Splitter.Panel>
              </Splitter.Root>
            ) : (
              <div style={contentStyle}>{main}</div>
            )}
          </div>
        </Splitter.Panel>
      </Splitter.Root>
    </div>
  );
}

export type { SidebarLayoutProps };
