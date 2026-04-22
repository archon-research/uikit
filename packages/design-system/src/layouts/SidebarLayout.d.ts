import type { ReactNode } from 'react';

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

declare function SidebarLayout(props: SidebarLayoutProps): ReactNode;

export { SidebarLayout };
export type { SidebarLayoutProps };
