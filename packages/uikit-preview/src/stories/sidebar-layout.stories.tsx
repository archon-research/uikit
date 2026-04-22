import { SidebarLayout, StyledSelect, ThemeProvider, ThemeToggle } from '@archon-research/design-system';

import '../../styled-system/styles.css';
import { css } from '../../styled-system/css';

const shellClassName = css({
  height: '100vh',
  width: '100%',
});

const sidebarClassName = css({
  display: 'grid',
  gap: '4',
  p: '4',
});

const sectionTitleClassName = css({
  color: 'text.default',
  fontSize: 'sm',
  fontWeight: 'semibold',
});

const mutedTextClassName = css({
  color: 'text.muted',
  fontSize: 'sm',
  lineHeight: '1.5',
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

const topBar = (
  <div className={rowClassName}>
    <span className={sectionTitleClassName}>Console</span>
    <ThemeToggle />
  </div>
);

const main = (
  <div className={mainClassName}>
    <div>
      <div className={sectionTitleClassName}>SidebarLayout</div>
      <p className={mutedTextClassName}>
        Resizable navigation column, main content area, optional top bar, and bottom panel.
      </p>
    </div>
    <div className={panelClassName}>
      <div className={sectionTitleClassName}>Active View</div>
      <p className={mutedTextClassName}>
        Drag the vertical and horizontal separators to resize the sidebar and bottom panel.
      </p>
    </div>
  </div>
);

const bottomPanel = (
  <div className={bottomPanelClassName}>
    <div className={sectionTitleClassName}>Activity</div>
    <p className={mutedTextClassName}>Recent preview builds, token changes, and theme updates.</p>
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
