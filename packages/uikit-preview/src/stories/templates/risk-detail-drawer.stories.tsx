import {
  Badge,
  Button,
  ThemeProvider,
  ThemeToggle,
  Tabs,
} from '@archon-research/design-system';
import { useState } from 'react';

import { css } from '../../../styled-system/css';

export default {
  title: 'Templates/Risk Detail Drawer',
};

// ============================================================================
// Layout & Base Styles
// ============================================================================

const shellClassName = css({
  height: '100vh',
  width: '100%',
  fontFamily: 'sans',
  color: 'text.default',
  display: 'flex',
});

const mainContentClassName = css({
  flex: '1',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
});

const topBarClassName = css({
  borderBottomColor: 'border.subtle',
  borderBottomStyle: 'solid',
  borderBottomWidth: '1px',
  display: 'flex',
  gap: '3',
  justifyContent: 'space-between',
  alignItems: 'center',
  p: '4',
});

const gridAreaClassName = css({
  flex: '1',
  p: '4',
  overflowY: 'auto',
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
  gap: '3',
});

const allocationCardClassName = css({
  borderColor: 'border.subtle',
  borderRadius: 'md',
  borderStyle: 'solid',
  borderWidth: '1px',
  p: '4',
  cursor: 'pointer',
  transition: 'all 0.2s ease',
  _hover: {
    borderColor: 'text.interactive',
    backgroundColor: 'surface.hover',
  },
});

const drawerClassName = css({
  width: '360px',
  borderLeftColor: 'border.subtle',
  borderLeftStyle: 'solid',
  borderLeftWidth: '1px',
  backgroundColor: 'surface.default',
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden',
});

const drawerHeaderClassName = css({
  borderBottomColor: 'border.subtle',
  borderBottomStyle: 'solid',
  borderBottomWidth: '1px',
  p: '4',
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
});

const drawerBodyClassName = css({
  flex: '1',
  overflowY: 'auto',
});

const drawerFooterClassName = css({
  borderTopColor: 'border.subtle',
  borderTopStyle: 'solid',
  borderTopWidth: '1px',
  p: '4',
  display: 'flex',
  gap: '2',
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

const metricRowClassName = css({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  py: '2',
  borderBottomColor: 'border.subtle',
  borderBottomStyle: 'solid',
  borderBottomWidth: '1px',
});

const metricLabelClassName = css({
  color: 'text.muted',
  fontSize: 'sm',
});

const metricValueClassName = css({
  color: 'text.default',
  fontSize: 'sm',
  fontWeight: 'semibold',
});

// ============================================================================
// Sample Data
// ============================================================================

const allocations = [
  {
    id: '1',
    protocol: 'Lido',
    symbol: 'stETH',
    amount: 4560000,
    allocation: 45.6,
    risk: 'low',
    change24h: 2.4,
    apy: 3.8,
  },
  {
    id: '2',
    protocol: 'Aave',
    symbol: 'aUSDC',
    amount: 2340000,
    allocation: 23.4,
    risk: 'medium',
    change24h: -0.8,
    apy: 4.2,
  },
  {
    id: '3',
    protocol: 'Curve',
    symbol: 'CRV',
    amount: 1890000,
    allocation: 18.9,
    risk: 'medium',
    change24h: 1.2,
    apy: 8.5,
  },
  {
    id: '4',
    protocol: 'Compound',
    symbol: 'cUSDC',
    amount: 890000,
    allocation: 8.9,
    risk: 'high',
    change24h: -3.1,
    apy: 2.1,
  },
];

// ============================================================================
// Components
// ============================================================================

const AllocationCard = ({ allocation, onSelect }: any) => (
  <button
    className={allocationCardClassName}
    onClick={() => onSelect(allocation)}
    style={{
      all: 'unset',
      display: 'block',
    }}
  >
    <div className={sectionTitleClassName}>{allocation.protocol}</div>
    <div className={mutedTextClassName}>{allocation.symbol}</div>
    <div
      className={css({
        mt: '3',
        display: 'flex',
        gap: '2',
        alignItems: 'center',
      })}
    >
      <Badge
        tone={
          allocation.risk === 'low'
            ? 'success'
            : allocation.risk === 'medium'
              ? 'warning'
              : 'critical'
        }
        size="sm"
      >
        {allocation.risk}
      </Badge>
      <span className={mutedTextClassName}>
        {allocation.allocation.toFixed(1)}%
      </span>
    </div>
  </button>
);

const RiskDetailDrawer = ({ allocation, onClose }: any) => {
  const [activeTab, setActiveTab] = useState('overview');

  if (!allocation) return null;

  const getRiskColor = (risk: string) => {
    return risk === 'low'
      ? 'success'
      : risk === 'medium'
        ? 'warning'
        : 'critical';
  };

  return (
    <div className={drawerClassName}>
      <div className={drawerHeaderClassName}>
        <div>
          <div className={sectionTitleClassName}>{allocation.protocol}</div>
          <div className={mutedTextClassName}>{allocation.symbol}</div>
        </div>
        <button
          onClick={onClose}
          className={css({
            color: 'text.muted',
            cursor: 'pointer',
            fontSize: 'lg',
            lineHeight: '1',
            border: 'none',
            background: 'transparent',
            _hover: {
              color: 'text.default',
            },
          })}
        >
          ✕
        </button>
      </div>

      <div className={drawerBodyClassName}>
        <Tabs.Root value={activeTab} onValueChange={setActiveTab}>
          <div
            className={css({
              borderBottomColor: 'border.subtle',
              borderBottomStyle: 'solid',
              borderBottomWidth: '1px',
              px: '4',
              display: 'flex',
              gap: '6',
            })}
          >
            <Tabs.Trigger value="overview">Overview</Tabs.Trigger>
            <Tabs.Trigger value="performance">Performance</Tabs.Trigger>
            <Tabs.Trigger value="actions">Actions</Tabs.Trigger>
          </div>

          <div className={css({ p: '4' })}>
            <Tabs.Content value="overview">
              <div className={css({ display: 'grid', gap: '4' })}>
                <div>
                  <div className={metricLabelClassName}>Position Size</div>
                  <div
                    className={css({
                      fontSize: 'lg',
                      fontWeight: 'semibold',
                      mt: '1',
                    })}
                  >
                    ${allocation.amount.toLocaleString('en-US')}
                  </div>
                </div>

                <div>
                  <div className={metricLabelClassName}>Risk Level</div>
                  <div className={css({ mt: '1' })}>
                    <Badge tone={getRiskColor(allocation.risk)} size="sm">
                      {allocation.risk.charAt(0).toUpperCase() +
                        allocation.risk.slice(1)}
                    </Badge>
                  </div>
                </div>

                <div>
                  <div className={css({ fontWeight: 'semibold', mb: '2' })}>
                    Key Metrics
                  </div>
                  <div className={metricRowClassName}>
                    <span className={metricLabelClassName}>24h Change</span>
                    <span
                      className={css({
                        color:
                          allocation.change24h > 0
                            ? 'text.success'
                            : 'text.critical',
                        fontWeight: 'semibold',
                      })}
                    >
                      {allocation.change24h > 0 ? '+' : ''}
                      {allocation.change24h.toFixed(2)}%
                    </span>
                  </div>
                  <div className={metricRowClassName}>
                    <span className={metricLabelClassName}>APY</span>
                    <span className={metricValueClassName}>
                      {allocation.apy.toFixed(2)}%
                    </span>
                  </div>
                  <div
                    className={metricRowClassName}
                    style={{ borderBottom: 'none' }}
                  >
                    <span className={metricLabelClassName}>Portfolio %</span>
                    <span className={metricValueClassName}>
                      {allocation.allocation.toFixed(1)}%
                    </span>
                  </div>
                </div>

                <div>
                  <div className={mutedTextClassName}>
                    Last updated 2 minutes ago
                  </div>
                </div>
              </div>
            </Tabs.Content>

            <Tabs.Content value="performance">
              <div className={css({ display: 'grid', gap: '4' })}>
                <div>
                  <div className={mutedTextClassName}>
                    Allocation-wide performance metrics would appear here,
                    including historical charts, breakdown by period, and
                    comparison to benchmarks.
                  </div>
                </div>
                <div
                  className={css({
                    p: '3',
                    backgroundColor: 'surface.hover',
                    borderRadius: 'md',
                  })}
                >
                  <div className={css({ fontWeight: 'semibold', mb: '2' })}>
                    7-Day Performance
                  </div>
                  <div className={css({ fontSize: 'xs', color: 'text.muted' })}>
                    Chart placeholder
                  </div>
                </div>
              </div>
            </Tabs.Content>

            <Tabs.Content value="actions">
              <div className={css({ display: 'grid', gap: '3' })}>
                <div
                  className={css({
                    p: '3',
                    borderRadius: 'md',
                    borderColor: 'border.subtle',
                    borderStyle: 'solid',
                    borderWidth: '1px',
                    backgroundColor: 'surface.hover',
                  })}
                >
                  <div className={css({ fontWeight: 'semibold', mb: '2' })}>
                    Recommended Actions
                  </div>
                  <ul className={css({ fontSize: 'sm', color: 'text.muted' })}>
                    <li>• Review risk exposure against targets</li>
                    <li>• Consider rebalancing if above 5% variance</li>
                    <li>• Monitor for protocol updates</li>
                  </ul>
                </div>

                <div className={css({ fontSize: 'xs', color: 'text.muted' })}>
                  Position alerts and notifications would appear here.
                </div>
              </div>
            </Tabs.Content>
          </div>
        </Tabs.Root>
      </div>

      <div className={drawerFooterClassName}>
        <Button size="sm" variant="outline" style={{ flex: 1 }}>
          Edit
        </Button>
        <Button size="sm" variant="outline" style={{ flex: 1 }}>
          Remove
        </Button>
      </div>
    </div>
  );
};

// ============================================================================
// Stories
// ============================================================================

export const Default = () => {
  const [selectedAllocation, setSelectedAllocation] = useState(allocations[0]);

  return (
    <ThemeProvider>
      <div className={shellClassName}>
        <div className={mainContentClassName}>
          <div className={topBarClassName}>
            <div className={sectionTitleClassName}>Portfolio Positions</div>
            <ThemeToggle />
          </div>
          <div className={gridAreaClassName}>
            {allocations.map((allocation) => (
              <AllocationCard
                key={allocation.id}
                allocation={allocation}
                onSelect={setSelectedAllocation}
              />
            ))}
          </div>
        </div>
        <RiskDetailDrawer
          allocation={selectedAllocation}
          onClose={() => setSelectedAllocation(null)}
        />
      </div>
    </ThemeProvider>
  );
};

export const DrawerClosed = () => {
  return (
    <ThemeProvider>
      <div className={shellClassName}>
        <div className={mainContentClassName}>
          <div className={topBarClassName}>
            <div className={sectionTitleClassName}>Portfolio Positions</div>
            <ThemeToggle />
          </div>
          <div className={gridAreaClassName}>
            {allocations.map((allocation) => (
              <AllocationCard
                key={allocation.id}
                allocation={allocation}
                onSelect={() => {}}
              />
            ))}
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
};

export const DrawerOpenPerformance = () => {
  return (
    <ThemeProvider>
      <div className={shellClassName}>
        <div className={mainContentClassName}>
          <div className={topBarClassName}>
            <div className={sectionTitleClassName}>Portfolio Positions</div>
            <ThemeToggle />
          </div>
          <div className={gridAreaClassName}>
            {allocations.map((allocation) => (
              <AllocationCard
                key={allocation.id}
                allocation={allocation}
                onSelect={() => {}}
              />
            ))}
          </div>
        </div>
        <RiskDetailDrawer allocation={allocations[0]} onClose={() => {}} />
      </div>
    </ThemeProvider>
  );
};
