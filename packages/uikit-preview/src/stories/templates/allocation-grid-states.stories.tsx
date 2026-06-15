import {
  Badge,
  DataTable,
  EmptyState,
  ErrorState,
  ThemeProvider,
  useDataTable,
} from '@archon-research/design-system';

import { css } from '../../../styled-system/css';

export default {
  title: 'Templates/Allocation Grid States',
};

// ============================================================================
// Layout & Base Styles
// ============================================================================

const wrapperClassName = css({
  p: '6',
  maxWidth: '100%',
  minHeight: '100vh',
  backgroundColor: 'surface.default',
});

const containerClassName = css({
  display: 'grid',
  gap: '6',
});

const sectionClassName = css({
  display: 'grid',
  gap: '2',
});

const sectionTitleClassName = css({
  color: 'text.default',
  fontSize: 'lg',
  fontWeight: 'semibold',
  lineHeight: '1.3',
});

const sectionDescriptionClassName = css({
  color: 'text.muted',
  fontSize: 'sm',
  lineHeight: '1.6',
});

const panelClassName = css({
  borderColor: 'border.subtle',
  borderRadius: 'lg',
  borderStyle: 'solid',
  borderWidth: '1px',
  backgroundColor: 'surface.default',
  overflow: 'hidden',
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
];

const filteredRows: AllocationRow[] = [
  {
    id: '1',
    protocol: 'Lido',
    chain: 'Ethereum',
    symbol: 'stETH',
    amountUsd: 4560000,
    allocation: 45.6,
    risk: 'low',
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
// State Variants
// ============================================================================

const LoadedState = () => {
  const table = useDataTable(allocationRows, allocationColumns as never, {
    enableSorting: true,
    enableSearch: true,
  });

  return (
    <div className={panelClassName}>
      <DataTable
        table={table}
        isLoading={false}
        getRowKey={(row: AllocationRow) => row.id}
      />
    </div>
  );
};

const LoadingState = () => {
  const table = useDataTable(allocationRows, allocationColumns as never, {
    enableSorting: true,
    enableSearch: true,
  });

  return (
    <div className={panelClassName}>
      <DataTable
        table={table}
        isLoading
        getRowKey={(row: AllocationRow) => row.id}
        skeletonConfig={{ rows: 5, columns: 5 }}
      />
    </div>
  );
};

const EmptyState_NoData = () => {
  return (
    <div className={css({ p: '12', textAlign: 'center' })}>
      <EmptyState
        title="No allocations yet"
        description="Start by adding your first position to build your portfolio."
        icon="💼"
      />
    </div>
  );
};

const EmptyState_NoResults = () => {
  return (
    <div className={css({ p: '12', textAlign: 'center' })}>
      <EmptyState
        title="No allocations match your filters"
        description="Try adjusting your search or filter criteria."
        icon="🔍"
      />
    </div>
  );
};

const ErrorState_FetchFailed = () => {
  return (
    <div className={css({ p: '12', textAlign: 'center' })}>
      <ErrorState
        title="Failed to load allocations"
        description="We encountered an error retrieving your allocation data. Please try again or contact support."
        onRetry={() => {
          console.log('Retry triggered');
        }}
      />
    </div>
  );
};

const FilteredState = () => {
  const table = useDataTable(filteredRows, allocationColumns as never, {
    enableSorting: true,
    enableSearch: true,
  });

  return (
    <div className={css({ display: 'grid', gap: '3' })}>
      <div
        className={css({
          p: '3',
          backgroundColor: 'surface.hover',
          borderRadius: 'md',
          display: 'flex',
          gap: '2',
          alignItems: 'center',
          justifyContent: 'space-between',
        })}
      >
        <span className={css({ fontSize: 'sm', color: 'text.muted' })}>
          Filtered: showing 1 of 3 allocations (low risk only)
        </span>
        <button
          className={css({
            fontSize: 'sm',
            color: 'text.interactive',
            cursor: 'pointer',
            textDecoration: 'underline',
          })}
        >
          Clear filters
        </button>
      </div>
      <div className={panelClassName}>
        <DataTable
          table={table}
          isLoading={false}
          getRowKey={(row: AllocationRow) => row.id}
        />
      </div>
    </div>
  );
};

// ============================================================================
// Stories
// ============================================================================

export const Loaded = () => (
  <ThemeProvider>
    <div className={wrapperClassName}>
      <div className={sectionClassName}>
        <div>
          <div className={sectionTitleClassName}>Loaded State</div>
          <div className={sectionDescriptionClassName}>
            Normal view with all allocations displayed and ready for
            interaction.
          </div>
        </div>
        <LoadedState />
      </div>
    </div>
  </ThemeProvider>
);

export const Loading = () => (
  <ThemeProvider>
    <div className={wrapperClassName}>
      <div className={sectionClassName}>
        <div>
          <div className={sectionTitleClassName}>Loading State</div>
          <div className={sectionDescriptionClassName}>
            Skeleton rows indicate data is being fetched. Shows the same column
            structure as loaded state for visual continuity.
          </div>
        </div>
        <LoadingState />
      </div>
    </div>
  </ThemeProvider>
);

export const Empty = () => (
  <ThemeProvider>
    <div className={wrapperClassName}>
      <div className={sectionClassName}>
        <div>
          <div className={sectionTitleClassName}>Empty State</div>
          <div className={sectionDescriptionClassName}>
            User has no allocations yet. Use this to onboard and encourage first
            action.
          </div>
        </div>
        <div className={panelClassName}>
          <EmptyState_NoData />
        </div>
      </div>
    </div>
  </ThemeProvider>
);

export const EmptyFiltered = () => (
  <ThemeProvider>
    <div className={wrapperClassName}>
      <div className={sectionClassName}>
        <div>
          <div className={sectionTitleClassName}>Empty Filtered State</div>
          <div className={sectionDescriptionClassName}>
            Filters were applied but no results match. Help user refine their
            criteria.
          </div>
        </div>
        <div className={panelClassName}>
          <EmptyState_NoResults />
        </div>
      </div>
    </div>
  </ThemeProvider>
);

export const Error = () => (
  <ThemeProvider>
    <div className={wrapperClassName}>
      <div className={sectionClassName}>
        <div>
          <div className={sectionTitleClassName}>Error State</div>
          <div className={sectionDescriptionClassName}>
            Network or server error occurred. Show retry option and clear error
            message.
          </div>
        </div>
        <div className={panelClassName}>
          <ErrorState_FetchFailed />
        </div>
      </div>
    </div>
  </ThemeProvider>
);

export const Filtered = () => (
  <ThemeProvider>
    <div className={wrapperClassName}>
      <div className={sectionClassName}>
        <div>
          <div className={sectionTitleClassName}>Filtered State</div>
          <div className={sectionDescriptionClassName}>
            Active filters reduce result set. Show filter status with option to
            clear.
          </div>
        </div>
        <FilteredState />
      </div>
    </div>
  </ThemeProvider>
);

export const AllStatesGallery = () => (
  <ThemeProvider>
    <div className={wrapperClassName}>
      <div className={containerClassName}>
        <div className={sectionClassName}>
          <div>
            <div className={sectionTitleClassName}>Loaded State</div>
            <div className={sectionDescriptionClassName}>
              Normal view with all allocations displayed.
            </div>
          </div>
          <LoadedState />
        </div>

        <div className={sectionClassName}>
          <div>
            <div className={sectionTitleClassName}>Loading State</div>
            <div className={sectionDescriptionClassName}>
              Skeleton rows while fetching data.
            </div>
          </div>
          <LoadingState />
        </div>

        <div className={sectionClassName}>
          <div>
            <div className={sectionTitleClassName}>Empty State</div>
            <div className={sectionDescriptionClassName}>
              No allocations yet.
            </div>
          </div>
          <div className={panelClassName}>
            <EmptyState_NoData />
          </div>
        </div>

        <div className={sectionClassName}>
          <div>
            <div className={sectionTitleClassName}>Error State</div>
            <div className={sectionDescriptionClassName}>
              Network or server error with retry.
            </div>
          </div>
          <div className={panelClassName}>
            <ErrorState_FetchFailed />
          </div>
        </div>

        <div className={sectionClassName}>
          <div>
            <div className={sectionTitleClassName}>Filtered State</div>
            <div className={sectionDescriptionClassName}>
              Filters applied, showing subset of results.
            </div>
          </div>
          <FilteredState />
        </div>
      </div>
    </div>
  </ThemeProvider>
);
