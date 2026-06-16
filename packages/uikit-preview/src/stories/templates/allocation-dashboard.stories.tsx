import {
  Badge,
  Button,
  DataTable,
  SidebarLayout,
  ThemeProvider,
  ThemeToggle,
  Tabs,
  useDataTable,
} from '@archon-research/design-system';
import { Download, Plus, Settings2 } from 'lucide-react';
import { useState } from 'react';

import { css } from '../../../styled-system/css';

export default {
  title: 'Templates/Allocation Dashboard',
};

// ============================================================================
// Layout & Base Styles
// ============================================================================

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
  cursor: 'pointer',
  _hover: {
    backgroundColor: 'surface.hover',
  },
});

const topBarClassName = css({
  alignItems: 'start',
  borderBottomColor: 'border.subtle',
  borderBottomStyle: 'solid',
  borderBottomWidth: '1px',
  display: 'flex',
  gap: '4',
  justifyContent: 'space-between',
  flexWrap: 'wrap',
  p: '4',
});

const topBarControlsClassName = css({
  display: 'grid',
  gap: '2',
  justifyItems: 'end',
  minWidth: 'min(100%, 34rem)',
  flex: '1',
});

const actionButtonsClassName = css({
  display: 'flex',
  gap: '2',
  alignItems: 'center',
  flexWrap: 'wrap',
  justifyContent: 'end',
});

const mainClassName = css({
  display: 'grid',
  gap: '4',
  p: '4',
  gridTemplateColumns: '1fr auto',
  gridTemplateRows: 'auto 1fr',
});

const metricsRailClassName = css({
  display: 'grid',
  gap: '2',
  gridColumn: '2',
  gridRow: '1 / 3',
  width: '280px',
  maxHeight: '100%',
  overflowY: 'auto',
});

const metricCardClassName = css({
  borderColor: 'border.subtle',
  borderRadius: 'md',
  borderStyle: 'solid',
  borderWidth: '1px',
  p: '3',
  backgroundColor: 'surface.default',
});

const metricLabelClassName = css({
  color: 'text.muted',
  fontSize: 'xs',
  fontWeight: 'medium',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  mb: '1',
});

const metricValueClassName = css({
  color: 'text.default',
  fontSize: 'lg',
  fontWeight: 'bold',
  lineHeight: '1.2',
});

const gridContainerClassName = css({
  display: 'grid',
  gap: '4',
  gridColumn: '1',
  gridRow: '2',
});

const panelClassName = css({
  borderColor: 'border.subtle',
  borderRadius: 'lg',
  borderStyle: 'solid',
  borderWidth: '1px',
  backgroundColor: 'surface.default',
  overflow: 'hidden',
  display: 'flex',
  flexDirection: 'column',
});

const panelHeaderClassName = css({
  display: 'flex',
  gap: '3',
  justifyContent: 'space-between',
  alignItems: 'center',
  p: '4',
  borderBottomColor: 'border.subtle',
  borderBottomStyle: 'solid',
  borderBottomWidth: '1px',
});

const panelBodyClassName = css({
  flex: '1',
  overflowY: 'auto',
});

const controlBarClassName = css({
  display: 'flex',
  gap: '2',
  alignItems: 'center',
});

// ============================================================================
// Sample Data & Columns
// ============================================================================

type AllocationRow = {
  id: string;
  protocol: string;
  chain: string;
  symbol: string;
  amountUsd: number;
  allocation: number;
  risk: 'low' | 'medium' | 'high';
};

const allocationRows: AllocationRow[] = [
  {
    id: '1',
    protocol: 'Lido',
    chain: 'Ethereum',
    symbol: 'stETH',
    amountUsd: 4560000,
    allocation: 45.6,
    risk: 'low',
  },
  {
    id: '2',
    protocol: 'Aave',
    chain: 'Ethereum',
    symbol: 'aUSDC',
    amountUsd: 2340000,
    allocation: 23.4,
    risk: 'medium',
  },
  {
    id: '3',
    protocol: 'Curve',
    chain: 'Ethereum',
    symbol: 'CRV',
    amountUsd: 1890000,
    allocation: 18.9,
    risk: 'medium',
  },
  {
    id: '4',
    protocol: 'Compound',
    chain: 'Arbitrum',
    symbol: 'cUSDC',
    amountUsd: 890000,
    allocation: 8.9,
    risk: 'high',
  },
  {
    id: '5',
    protocol: 'Balancer',
    chain: 'Polygon',
    symbol: 'BAL',
    amountUsd: 320000,
    allocation: 3.2,
    risk: 'high',
  },
];

const allocationColumns = [
  {
    accessorKey: 'protocol',
    header: 'Protocol',
    cell: ({ row }: { row: { original: AllocationRow } }) => (
      <span className={css({ fontWeight: 'medium' })}>
        {row.original.protocol}
      </span>
    ),
  },
  {
    accessorKey: 'chain',
    header: 'Chain',
    cell: ({ row }: { row: { original: AllocationRow } }) => row.original.chain,
  },
  {
    accessorKey: 'amountUsd',
    header: 'Amount (USD)',
    cell: ({ row }: { row: { original: AllocationRow } }) =>
      `$${row.original.amountUsd.toLocaleString('en-US')}`,
  },
  {
    accessorKey: 'allocation',
    header: '% of Portfolio',
    cell: ({ row }: { row: { original: AllocationRow } }) =>
      `${row.original.allocation.toFixed(1)}%`,
  },
  {
    accessorKey: 'risk',
    header: 'Risk',
    cell: ({ row }: { row: { original: AllocationRow } }) => {
      const risk = row.original.risk;
      const tone: 'neutral' | 'success' | 'warning' | 'danger' =
        risk === 'low' ? 'success' : risk === 'medium' ? 'warning' : 'danger';
      return (
        <Badge tone={tone}>
          {risk.charAt(0).toUpperCase() + risk.slice(1)}
        </Badge>
      );
    },
  },
];

// ============================================================================
// Components
// ============================================================================

const MetricCard = ({
  label,
  value,
  change,
}: {
  label: string;
  value: string;
  change?: string;
}) => (
  <div className={metricCardClassName}>
    <div className={metricLabelClassName}>{label}</div>
    <div className={metricValueClassName}>{value}</div>
    {change && (
      <div className={css({ color: 'text.muted', fontSize: 'xs', mt: '1' })}>
        {change}
      </div>
    )}
  </div>
);

const Sidebar = () => (
  <div className={sidebarClassName}>
    <div>
      <div className={sectionTitleClassName}>Portfolio</div>
      <p className={mutedTextClassName}>View and manage your allocations.</p>
    </div>
    <div className={navListClassName}>
      <div className={navItemClassName}>All Allocations</div>
      <div className={navItemClassName}>By Chain</div>
      <div className={navItemClassName}>By Risk Level</div>
      <div className={navItemClassName}>Rebalance</div>
    </div>
    <div
      className={css({
        borderColor: 'border.subtle',
        borderRadius: 'md',
        borderStyle: 'solid',
        borderWidth: '1px',
        p: '3',
      })}
    >
      <div className={sectionTitleClassName}>Status</div>
      <p className={mutedTextClassName}>Last updated 2 minutes ago.</p>
    </div>
  </div>
);

const TopBar = () => (
  <div className={topBarClassName}>
    <div>
      <div className={sectionTitleClassName}>Allocations</div>
    </div>
    <div className={topBarControlsClassName}>
      <div className={actionButtonsClassName}>
        <Button>
          <Settings2 size={16} strokeWidth={1.8} />
          Settings
        </Button>
        <Button>
          <Download size={16} strokeWidth={1.8} />
          Export
        </Button>
      </div>
      <div className={controlBarClassName}>
        <ThemeToggle />
      </div>
    </div>
  </div>
);

const MetricsRail = () => (
  <div className={metricsRailClassName}>
    <MetricCard label="Total Value" value="$10.0M" change="+2.4% today" />
    <MetricCard label="Portfolio Risk" value="Medium" change="2 high risk" />
    <MetricCard label="Active Allocations" value="5" change="2 rebalancing" />
    <MetricCard label="Top Performer" value="Lido" change="+12.3% week" />
  </div>
);

const GridPanel = () => {
  const table = useDataTable(allocationRows, allocationColumns as never, {
    enableSorting: true,
    enableSearch: true,
  });

  return (
    <div className={panelClassName}>
      <div className={panelHeaderClassName}>
        <div className={sectionTitleClassName}>Current Allocations</div>
        <Button>
          <Plus size={16} strokeWidth={1.8} />
          Add Position
        </Button>
      </div>
      <div className={panelBodyClassName}>
        <DataTable
          table={table}
          isLoading={false}
          getRowKey={(row: AllocationRow) => row.id}
        />
      </div>
    </div>
  );
};

const BottomPanel = () => {
  const [activeTab, setActiveTab] = useState('activity');

  return (
    <div className={panelClassName}>
      <Tabs.Root
        value={activeTab}
        onValueChange={(details) => setActiveTab(details.value)}
      >
        <div
          className={css({
            borderBottomColor: 'border.subtle',
            borderBottomStyle: 'solid',
            borderBottomWidth: '1px',
            p: '4',
            display: 'flex',
            gap: '6',
          })}
        >
          <Tabs.Trigger value="activity">Activity</Tabs.Trigger>
          <Tabs.Trigger value="breakdown">Breakdown</Tabs.Trigger>
          <Tabs.Trigger value="alerts">Alerts</Tabs.Trigger>
        </div>
        <div className={css({ p: '4', flex: '1', overflowY: 'auto' })}>
          <Tabs.Content value="activity">
            <div className={css({ display: 'grid', gap: '3' })}>
              <div
                className={css({
                  borderColor: 'border.subtle',
                  borderRadius: 'md',
                  borderStyle: 'solid',
                  borderWidth: '1px',
                  p: '3',
                })}
              >
                <div className={css({ fontWeight: 'medium', mb: '1' })}>
                  Rebalance completed
                </div>
                <p className={mutedTextClassName}>
                  Portfolio adjusted by +2.3%. 2 minutes ago.
                </p>
              </div>
              <div
                className={css({
                  borderColor: 'border.subtle',
                  borderRadius: 'md',
                  borderStyle: 'solid',
                  borderWidth: '1px',
                  p: '3',
                })}
              >
                <div className={css({ fontWeight: 'medium', mb: '1' })}>
                  Risk threshold warning
                </div>
                <p className={mutedTextClassName}>
                  Compound position exceeds risk threshold. 15 minutes ago.
                </p>
              </div>
            </div>
          </Tabs.Content>
          <Tabs.Content value="breakdown">
            <p className={mutedTextClassName}>
              Portfolio composition by chain, protocol, and risk category.
            </p>
          </Tabs.Content>
          <Tabs.Content value="alerts">
            <p className={mutedTextClassName}>
              No active alerts. Your portfolio is within target parameters.
            </p>
          </Tabs.Content>
        </div>
      </Tabs.Root>
    </div>
  );
};

// ============================================================================
// Stories
// ============================================================================

export const Default = () => (
  <ThemeProvider>
    <div className={shellClassName}>
      <SidebarLayout
        sidebar={<Sidebar />}
        topBar={<TopBar />}
        main={
          <div className={mainClassName}>
            <div className={gridContainerClassName}>
              <GridPanel />
              <BottomPanel />
            </div>
            <MetricsRail />
          </div>
        }
      />
    </div>
  </ThemeProvider>
);
