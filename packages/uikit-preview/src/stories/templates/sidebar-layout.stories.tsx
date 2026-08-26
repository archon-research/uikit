import {
  SidebarLayout,
  StyledSelect,
  ThemeProvider,
  ThemeToggle,
} from '@archon-research/design-system';
import { useEffect } from 'react';

import { css } from '../../../styled-system/css';

export default {
  title: 'Templates/Sidebar Layout',
};

const shellClassName = css({
  height: '100vh',
  width: '100%',
  fontFamily: 'sans',
  color: 'text.default',
});

const sidebarClassName = css({
  display: 'grid',
  gap: '4',
  p: '4',
  fontSize: 'sm',
});

const sectionTitleClassName = css({
  color: 'text.default',
  fontSize: 'md',
  fontWeight: 'semibold',
  lineHeight: '1.3',
});

const mutedTextClassName = css({
  color: 'text.muted',
  fontSize: 'sm',
  lineHeight: '1.6',
});

const navListClassName = css({
  display: 'grid',
  gap: '2',
});

const navItemClassName = css({
  borderColor: 'border.subtle',
  borderRadius: 'md',
  borderStyle: 'solid',
  borderWidth: '1px',
  color: 'text.default',
  fontSize: 'md',
  fontWeight: 'medium',
  lineHeight: '1.4',
  px: '3',
  py: '2',
});

const mainClassName = css({
  display: 'grid',
  gap: '5',
  p: '6',
});

const panelClassName = css({
  borderColor: 'border.subtle',
  borderRadius: 'lg',
  borderStyle: 'solid',
  borderWidth: '1px',
  p: '4',
});

const rowClassName = css({
  alignItems: 'center',
  display: 'flex',
  gap: '3',
  justifyContent: 'space-between',
});

const bottomPanelClassName = css({
  display: 'grid',
  gap: '3',
  p: '4',
});

const sidebar = (
  <div className={sidebarClassName}>
    <div>
      <div className={sectionTitleClassName}>Navigation</div>
      <p className={mutedTextClassName}>Workspace sections and saved views.</p>
    </div>
    <div className={navListClassName}>
      <div className={navItemClassName}>Overview</div>
      <div className={navItemClassName}>Components</div>
      <div className={navItemClassName}>Layouts</div>
      <div className={navItemClassName}>Tokens</div>
    </div>
    <div className={panelClassName}>
      <div className={sectionTitleClassName}>Environment</div>
      <div className={css({ mt: '3' })}>
        <StyledSelect defaultValue="staging">
          <option value="local">Local</option>
          <option value="staging">Staging</option>
          <option value="production">Production</option>
        </StyledSelect>
      </div>
    </div>
  </div>
);

const toolbarClassName = css({
  alignItems: 'center',
  display: 'flex',
  gap: '3',
});

const topBar = (
  <div className={rowClassName}>
    <span className={sectionTitleClassName}>Console</span>
    <div className={toolbarClassName}>
      {/* compact icon cycle form alongside the segmented default. */}
      <ThemeToggle variant="icon" />
      <ThemeToggle />
    </div>
  </div>
);

const main = (
  <div className={mainClassName}>
    <div>
      <div className={sectionTitleClassName}>SidebarLayout</div>
      <p className={mutedTextClassName}>
        Resizable navigation column, main content area, optional top bar, and
        bottom panel.
      </p>
    </div>
    <div className={panelClassName}>
      <div className={sectionTitleClassName}>Active View</div>
      <p className={mutedTextClassName}>
        Drag the Ark Splitter-backed vertical and horizontal separators to
        resize the sidebar and bottom panel.
      </p>
    </div>
  </div>
);

const bottomPanel = (
  <div className={bottomPanelClassName}>
    <div className={sectionTitleClassName}>Activity</div>
    <p className={mutedTextClassName}>
      Recent preview builds, token changes, and theme updates.
    </p>
    <div className={panelClassName}>Preview rebuilt successfully.</div>
  </div>
);

export const Default = () => (
  <ThemeProvider>
    <div className={shellClassName}>
      <SidebarLayout
        bottomPanel={bottomPanel}
        main={main}
        sidebar={sidebar}
        topBar={topBar}
      />
    </div>
  </ThemeProvider>
);

// Ladle has no `play` function, but a real DOM focus event drives Ark
// Splitter's own state machine (data-focus / :focus-visible), so mounting
// with the trigger already focused exercises the same visual state a user
// hits mid-drag — this is what would have caught the resize-trigger's
// double-outline regression (missing `outline: none` + designed focus ring).
export const ResizeHandleFocused = () => {
  useEffect(() => {
    document
      .querySelector<HTMLElement>('[aria-label="Resize sidebar"]')
      ?.focus();
  }, []);

  return (
    <ThemeProvider>
      <div className={shellClassName}>
        <SidebarLayout
          bottomPanel={bottomPanel}
          main={main}
          sidebar={sidebar}
          topBar={topBar}
        />
      </div>
    </ThemeProvider>
  );
};

const narrowShellClassName = css({
  height: '100vh',
  width: '100%',
  maxWidth: '460px',
  marginInline: 'auto',
  borderInlineWidth: '1px',
  borderInlineStyle: 'solid',
  borderColor: 'border.subtle',
  fontFamily: 'sans',
  color: 'text.default',
});

// Below `collapseBelow` the split collapses to a single scrolling column
// (sidebar stacked above main, no resizable Splitter). The value is set above
// any realistic width so the stacked path renders deterministically for the
// snapshot, independent of the canvas viewport.
export const Stacked = () => (
  <ThemeProvider>
    <div className={narrowShellClassName}>
      <SidebarLayout
        bottomPanel={bottomPanel}
        collapseBelow={100000}
        main={main}
        sidebar={sidebar}
        topBar={topBar}
      />
    </div>
  </ThemeProvider>
);
