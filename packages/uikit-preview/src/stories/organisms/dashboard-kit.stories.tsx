import {
  DashboardRenderer,
  type DashboardDataSources,
  type DashboardSpec,
} from '@archon-research/dashboard-kit';
import { ThemeProvider } from '@archon-research/design-system';

import { css } from '../../../styled-system/css';

export default {
  title: 'Organisms/Dashboard Kit',
};

const pageClassName = css({
  p: '6',
  maxWidth: '6xl',
  marginInline: 'auto',
  fontFamily: 'sans',
  color: 'text.default',
});

const captionClassName = css({
  fontSize: 'sm',
  color: 'text.muted',
  marginBottom: '4',
  lineHeight: '1.6',
});

/**
 * A GENERIC sample manifest — no domain vocabulary. It exercises the whole
 * engine: a column split holding a stat row, a nested row split (line chart +
 * data table), and a note. The table WRITES `highlightedKey` on row click; the
 * stat row READS it and emphasizes the matching tile — cross-highlighting
 * declared entirely in the manifest's `interaction`, with the table's write
 * flagged `agentWritable` (default-deny agent exposure).
 */
const spec: DashboardSpec = {
  version: 1,
  title: 'Sample dashboard',
  layout: {
    type: 'split',
    direction: 'column',
    children: [
      { type: 'widget', ref: 'metrics' },
      {
        type: 'split',
        direction: 'row',
        children: [
          { type: 'widget', ref: 'trend', size: 2 },
          { type: 'widget', ref: 'breakdown', size: 1 },
        ],
      },
      { type: 'widget', ref: 'note' },
    ],
  },
  widgets: {
    metrics: {
      id: 'metrics',
      component: 'statRow',
      title: 'Regions',
      dataBinding: {
        source: 'regions',
        fields: { label: 'region', value: 'total', sub: 'change' },
      },
      interaction: { reads: ['highlightedKey'] },
    },
    trend: {
      id: 'trend',
      component: 'lineChart',
      title: 'Weekly volume',
      dataBinding: { source: 'weekly', fields: {} },
      props: {
        xField: 'day',
        height: 260,
        series: [
          { key: 'This week', field: 'current' },
          { key: 'Last week', field: 'previous' },
        ],
      },
    },
    breakdown: {
      id: 'breakdown',
      component: 'table',
      title: 'By region',
      dataBinding: { source: 'regions', fields: { rowKey: 'region' } },
      props: {
        columns: [
          { accessorKey: 'region', header: 'Region' },
          { accessorKey: 'total', header: 'Total', render: 'number' },
          { accessorKey: 'tier', header: 'Tier', render: 'badge' },
        ],
      },
      interaction: {
        writes: ['highlightedKey'],
        agentWritable: ['highlightedKey'],
      },
    },
    note: {
      id: 'note',
      component: 'note',
      title: 'About',
      props: {
        text: 'Click a table row to highlight the matching region tile. The whole view is rendered from a declarative DashboardSpec — layout tree, widget registry, data bindings, and interaction keys.',
      },
    },
  },
};

const dataSources: DashboardDataSources = {
  regions: [
    { region: 'North', total: 1240, change: '+4.2%', tier: 'high' },
    { region: 'South', total: 860, change: '-1.1%', tier: 'medium' },
    { region: 'East', total: 1520, change: '+7.8%', tier: 'high' },
    { region: 'West', total: 430, change: '-3.4%', tier: 'low' },
  ],
  weekly: [
    { day: 'Mon', current: 124, previous: 110 },
    { day: 'Tue', current: 160, previous: 132 },
    { day: 'Wed', current: 142, previous: 138 },
    { day: 'Thu', current: 182, previous: 150 },
    { day: 'Fri', current: 176, previous: 168 },
    { day: 'Sat', current: 214, previous: 190 },
    { day: 'Sun', current: 205, previous: 198 },
  ],
};

export const SampleManifest = () => (
  <ThemeProvider>
    <div className={pageClassName}>
      <p className={captionClassName}>
        A generic manifest rendered through{' '}
        <code>@archon-research/dashboard-kit</code>. Click a table row to
        cross-highlight the matching region tile.
      </p>
      <DashboardRenderer spec={spec} dataSources={dataSources} />
    </div>
  </ThemeProvider>
);
