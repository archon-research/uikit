import { useEffect, useState, type CSSProperties, type MouseEvent, type ReactNode } from 'react';

import { ResizeHandle } from '../components/ResizeHandle';

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

type DragState = {
  startPosition: number;
  startSize: number;
};

const DEFAULT_SIDEBAR_WIDTH = 320;
const DEFAULT_MIN_SIDEBAR_WIDTH = 200;
const DEFAULT_MAX_SIDEBAR_WIDTH = 600;

const DEFAULT_BOTTOM_HEIGHT = 280;
const DEFAULT_MIN_BOTTOM_HEIGHT = 120;
const DEFAULT_MAX_BOTTOM_HEIGHT = 600;

const SIDEBAR_STORAGE_KEY = 'sidebar-width';
const BOTTOM_STORAGE_KEY = 'bottom-panel-height';

const rootStyle: CSSProperties = {
  display: 'flex',
  width: '100%',
  height: '100vh',
  minWidth: 0,
  overflow: 'hidden',
};

const sidebarBaseStyle: CSSProperties = {
  position: 'relative',
  flexShrink: 0,
  height: '100vh',
  overflow: 'auto',
  borderRight: '1px solid var(--colors-border-subtle, #d0d5dd)',
  background: 'var(--colors-surface-default, #ffffff)',
};

const mainStyle: CSSProperties = {
  minWidth: 0,
  flex: 1,
  height: '100vh',
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
  minHeight: 64,
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
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
};

const bottomPanelStyle: CSSProperties = {
  background: 'var(--colors-surface-default, #ffffff)',
  borderTop: '1px solid var(--colors-border-subtle, #d0d5dd)',
  overflow: 'auto',
  minHeight: 0,
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

  const [sidebarDrag, setSidebarDrag] = useState<DragState | null>(null);
  const [bottomDrag, setBottomDrag] = useState<DragState | null>(null);

  useEffect(() => {
    if (!isBrowser()) {
      return;
    }

    if (sidebarDrag === null) {
      return;
    }

    const handleMouseMove = (event: globalThis.MouseEvent) => {
      const delta = event.clientX - sidebarDrag.startPosition;
      const next = clamp(
        sidebarDrag.startSize + delta,
        minSidebarWidth,
        maxSidebarWidth,
      );
      setSidebarWidth(next);
    };

    const handleMouseUp = () => {
      window.localStorage.setItem(sidebarStorageKey, String(sidebarWidth));
      setSidebarDrag(null);
    };

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'col-resize';

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp, { once: true });

    return () => {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [sidebarDrag, maxSidebarWidth, minSidebarWidth, sidebarStorageKey, sidebarWidth]);

  useEffect(() => {
    if (!isBrowser()) {
      return;
    }

    if (bottomDrag === null) {
      return;
    }

    const handleMouseMove = (event: globalThis.MouseEvent) => {
      const delta = bottomDrag.startPosition - event.clientY;
      const next = clamp(
        bottomDrag.startSize + delta,
        minBottomPanelHeight,
        maxBottomPanelHeight,
      );
      setBottomPanelHeight(next);
    };

    const handleMouseUp = () => {
      window.localStorage.setItem(bottomPanelStorageKey, String(bottomPanelHeight));
      setBottomDrag(null);
    };

    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'row-resize';

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp, { once: true });

    return () => {
      document.body.style.userSelect = '';
      document.body.style.cursor = '';
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [
    bottomDrag,
    maxBottomPanelHeight,
    minBottomPanelHeight,
    bottomPanelStorageKey,
    bottomPanelHeight,
  ]);

  const startSidebarDrag = (event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    setSidebarDrag({
      startPosition: event.clientX,
      startSize: sidebarWidth,
    });
  };

  const startBottomDrag = (event: MouseEvent<HTMLDivElement>) => {
    event.preventDefault();
    setBottomDrag({
      startPosition: event.clientY,
      startSize: bottomPanelHeight,
    });
  };

  return (
    <div style={rootStyle}>
      <aside style={{ ...sidebarBaseStyle, width: sidebarWidth }}>
        {sidebar}
        <ResizeHandle
          axis="vertical"
          label="Resize sidebar"
          onMouseDown={startSidebarDrag}
        />
      </aside>

      <main style={mainStyle}>
        {topBar ? <header style={topBarStyle}>{topBar}</header> : null}

        <div style={mainColumnStyle}>
          <div style={contentStyle}>{main}</div>

          {bottomPanel ? (
            <>
              <ResizeHandle
                axis="horizontal"
                label="Resize bottom panel"
                onMouseDown={startBottomDrag}
                placement="block"
              />
              <section style={{ ...bottomPanelStyle, height: bottomPanelHeight }}>
                {bottomPanel}
              </section>
            </>
          ) : null}
        </div>
      </main>
    </div>
  );
}

export type { SidebarLayoutProps };
