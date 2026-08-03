import { SplitLayout, ThemeProvider } from '@archon-research/design-system';
import { useState } from 'react';

import { css } from '../../../styled-system/css';

export default {
  title: 'Templates/Split Layout',
};

const shellClassName = css({
  height: '480px',
  width: '100%',
  fontFamily: 'sans',
  color: 'text.default',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'border.subtle',
  borderRadius: 'lg',
  overflow: 'hidden',
});

const paneClassName = css({
  display: 'grid',
  gap: '2',
  alignContent: 'start',
  p: '4',
  height: 'full',
});

const paneTitleClassName = css({
  fontSize: 'sm',
  fontWeight: 'semibold',
});

const paneBodyClassName = css({
  fontSize: 'xs',
  color: 'text.muted',
  lineHeight: '1.6',
});

function Pane({ label, body }: { label: string; body: string }) {
  return (
    <div className={paneClassName}>
      <div className={paneTitleClassName}>{label}</div>
      <p className={paneBodyClassName}>{body}</p>
    </div>
  );
}

// Three panels in a row: an even split falls out of every panel defaulting
// to `size: 1` (no weight needed for the common case).
export const ThreeWayRow = () => (
  <ThemeProvider>
    <div className={shellClassName}>
      <SplitLayout
        orientation="horizontal"
        panels={[
          {
            id: 'a',
            content: (
              <Pane
                label="Panel A"
                body="Drag either handle to resize. Every panel floors at 10% so none can be dragged to an unrecoverable sliver."
              />
            ),
          },
          {
            id: 'b',
            content: (
              <Pane
                label="Panel B"
                body="A third panel — N-way is just another entry in the panels array."
              />
            ),
          },
          {
            id: 'c',
            content: (
              <Pane label="Panel C" body="No special-casing past two panes." />
            ),
          },
        ]}
      />
    </div>
  </ThemeProvider>
);

// Weighted initial split: a 1:2 weight ratio starts at 33%/67%.
export const WeightedSplit = () => (
  <ThemeProvider>
    <div className={shellClassName}>
      <SplitLayout
        orientation="horizontal"
        panels={[
          {
            id: 'nav',
            size: 1,
            minSize: 15,
            maxSize: 40,
            content: (
              <Pane label="Nav (weight 1)" body="Starts at 33% of the row." />
            ),
          },
          {
            id: 'content',
            size: 2,
            content: (
              <Pane
                label="Content (weight 2)"
                body="Starts at 67% of the row."
              />
            ),
          },
        ]}
      />
    </div>
  </ThemeProvider>
);

// Nesting: the right panel of a horizontal split is itself a vertical
// SplitLayout. Mixed row/column layouts fall out of ordinary composition —
// SplitLayout has no separate "nested" API.
export const NestedRowAndColumn = () => (
  <ThemeProvider>
    <div className={shellClassName}>
      <SplitLayout
        orientation="horizontal"
        panels={[
          {
            id: 'sidebar',
            size: 1,
            minSize: 15,
            maxSize: 45,
            content: (
              <Pane label="Sidebar" body="The outer split's left panel." />
            ),
          },
          {
            id: 'stack',
            size: 2,
            content: (
              <SplitLayout
                orientation="vertical"
                panels={[
                  {
                    id: 'top',
                    content: (
                      <Pane
                        label="Nested top"
                        body="A vertical SplitLayout nested inside the outer split's right panel."
                      />
                    ),
                  },
                  {
                    id: 'bottom',
                    size: 1.5,
                    content: (
                      <Pane
                        label="Nested bottom"
                        body="Resizes independently of the outer split."
                      />
                    ),
                  },
                ]}
              />
            ),
          },
        ]}
      />
    </div>
  </ThemeProvider>
);

// Controlled sizes: `size`/`onResize` mirror useDataTable's controlled/
// uncontrolled pattern, so a consumer can persist the split (e.g. to
// localStorage) the same way SidebarLayout persists its own width.
export const ControlledSizes = () => {
  const [size, setSize] = useState([30, 70]);

  return (
    <ThemeProvider>
      <div className={css({ display: 'grid', gap: '3' })}>
        <div className={css({ fontSize: 'sm', color: 'text.muted' })}>
          Sizes: {size.map((value) => `${value.toFixed(0)}%`).join(' / ')}
        </div>
        <div className={shellClassName}>
          <SplitLayout
            orientation="horizontal"
            panels={[
              {
                id: 'left',
                content: (
                  <Pane
                    label="Left"
                    body="Controlled — the parent owns these percentages."
                  />
                ),
              },
              {
                id: 'right',
                content: (
                  <Pane label="Right" body="Sizes update live via onResize." />
                ),
              },
            ]}
            size={size}
            onResize={(details) => setSize(details.size)}
          />
        </div>
      </div>
    </ThemeProvider>
  );
};
