import {
  DataTable,
  SearchInput,
  useDataTable,
} from '@archon-research/design-system';
import type { SortingState } from '@tanstack/react-table';
import { useMemo, useState } from 'react';

import { css } from '../../../styled-system/css';

type Row = {
  symbol: string;
  chain: string;
  amountUsd: number;
};

const rows: Row[] = [
  { symbol: 'USDC', chain: 'Ethereum', amountUsd: 1200450 },
  { symbol: 'WETH', chain: 'Base', amountUsd: 980210 },
  { symbol: 'WBTC', chain: 'Arbitrum', amountUsd: 661340 },
  { symbol: 'rETH', chain: 'Optimism', amountUsd: 412001 },
  { symbol: 'sDAI', chain: 'Avalanche', amountUsd: 309710 },
];

const columns = [
  {
    accessorKey: 'symbol',
    header: 'Symbol',
    cell: ({ row }: { row: { original: Row } }) => row.original.symbol,
  },
  {
    accessorKey: 'chain',
    header: 'Chain',
    cell: ({ row }: { row: { original: Row } }) => row.original.chain,
  },
  {
    accessorKey: 'amountUsd',
    header: 'Amount (USD)',
    cell: ({ row }: { row: { original: Row } }) =>
      `$${row.original.amountUsd.toLocaleString('en-US')}`,
  },
];

export default {
  title: 'Organisms/Data Table',
};

const wrapperClassName = css({
  p: '6',
  maxWidth: '5xl',
});

export const Default = () => {
  const table = useDataTable(rows, columns as never, {
    enableSorting: true,
    enableSearch: true,
  });

  return (
    <div className={wrapperClassName}>
      <DataTable
        table={table}
        isLoading={false}
        getRowKey={(row: Row) => `${row.chain}:${row.symbol}`}
      />
    </div>
  );
};

export const Loading = () => {
  const table = useDataTable([], columns as never, {
    enableSorting: true,
    enableSearch: true,
  });

  return (
    <div className={wrapperClassName}>
      <DataTable
        table={table}
        isLoading
        skeletonConfig={{ rows: 4, columns: 3, firstColumnTall: true }}
      />
    </div>
  );
};

export const RowSelection = () => {
  const [selectedRowKey, setSelectedRowKey] = useState<string | null>(
    'Base:WETH',
  );
  const table = useDataTable(rows, columns as never, {
    enableSorting: true,
    enableSearch: true,
  });

  return (
    <div className={wrapperClassName}>
      <DataTable
        table={table}
        isLoading={false}
        getRowKey={(row: Row) => `${row.chain}:${row.symbol}`}
        selectedRowKey={selectedRowKey}
        onRowClick={(row: Row) =>
          setSelectedRowKey(`${row.chain}:${row.symbol}`)
        }
      />
    </div>
  );
};

export const ControlledState = () => {
  const [sorting, setSorting] = useState<SortingState>([]);
  const [query, setQuery] = useState('');

  const filteredRows = useMemo(() => {
    const normalizedQuery = query.toLowerCase().trim();

    if (!normalizedQuery) {
      return rows;
    }

    return rows.filter((row) => {
      return `${row.symbol} ${row.chain}`
        .toLowerCase()
        .includes(normalizedQuery);
    });
  }, [query]);

  const table = useDataTable(filteredRows, columns as never, {
    enableSorting: true,
    enableSearch: true,
    sorting,
    onSortingChange: setSorting,
    globalFilter: query,
    onGlobalFilterChange: setQuery,
  });

  return (
    <div className={wrapperClassName}>
      <div
        className={css({
          display: 'grid',
          gap: '4',
          mb: '4',
          maxWidth: 'sm',
        })}
      >
        <SearchInput
          value={query}
          onValueChange={setQuery}
          placeholder="Search by symbol or chain"
          aria-label="Search rows"
        />
      </div>

      <DataTable
        table={table}
        isLoading={false}
        getRowKey={(row: Row) => `${row.chain}:${row.symbol}`}
      />
    </div>
  );
};

const casingPolicyColumns = [
  {
    accessorKey: 'symbol',
    header: 'asset symbol',
    cell: ({ row }: { row: { original: Row } }) => row.original.symbol,
  },
  {
    accessorKey: 'chain',
    header: 'execution chain',
    cell: ({ row }: { row: { original: Row } }) => row.original.chain,
  },
  {
    accessorKey: 'amountUsd',
    header: 'gross amount usd',
    cell: ({ row }: { row: { original: Row } }) =>
      `$${row.original.amountUsd.toLocaleString('en-US')}`,
  },
];

export const HeaderCasingPolicy = () => {
  const table = useDataTable(rows, casingPolicyColumns as never, {
    enableSorting: true,
    enableSearch: true,
  });

  return (
    <div className={wrapperClassName}>
      <DataTable
        table={table}
        isLoading={false}
        getRowKey={(row: Row) => `${row.chain}:${row.symbol}`}
      />
    </div>
  );
};

const magnitudeRows: Row[] = [
  { symbol: 'USDC', chain: 'Ethereum', amountUsd: 12500 },
  { symbol: 'WETH', chain: 'Base', amountUsd: 980000 },
  { symbol: 'WBTC', chain: 'Arbitrum', amountUsd: 2210000 },
  { symbol: 'rETH', chain: 'Optimism', amountUsd: 145000 },
  { symbol: 'sDAI', chain: 'Avalanche', amountUsd: 45000 },
];

const magnitudeColumns = [
  {
    accessorKey: 'symbol',
    header: 'Symbol',
    cell: ({ row }: { row: { original: Row } }) => row.original.symbol,
  },
  {
    accessorKey: 'chain',
    header: 'Chain',
    cell: ({ row }: { row: { original: Row } }) => row.original.chain,
  },
  {
    accessorKey: 'amountUsd',
    header: 'Amount (USD, log default)',
    meta: {
      magnitude: {
        enabled: true,
      },
    },
    cell: ({ row }: { row: { original: Row } }) =>
      `$${row.original.amountUsd.toLocaleString('en-US')}`,
  },
];

const linearMagnitudeColumns = [
  {
    accessorKey: 'symbol',
    header: 'Symbol',
    cell: ({ row }: { row: { original: Row } }) => row.original.symbol,
  },
  {
    accessorKey: 'chain',
    header: 'Chain',
    cell: ({ row }: { row: { original: Row } }) => row.original.chain,
  },
  {
    accessorKey: 'amountUsd',
    header: 'Amount (USD, linear fixed domain)',
    meta: {
      magnitude: {
        enabled: true,
        scale: 'linear',
        domain: { min: 0, max: 2500000 },
        getValueText: (value: number) =>
          `$${Math.round(value).toLocaleString('en-US')}`,
      },
    },
    cell: ({ row }: { row: { original: Row } }) =>
      `$${row.original.amountUsd.toLocaleString('en-US')}`,
  },
];

export const MagnitudeColumns = () => {
  const logTable = useDataTable(magnitudeRows, magnitudeColumns as never, {
    enableSorting: true,
    enableSearch: true,
  });
  const linearTable = useDataTable(
    magnitudeRows,
    linearMagnitudeColumns as never,
    {
      enableSorting: true,
      enableSearch: true,
    },
  );

  return (
    <div
      className={css({
        p: '6',
        display: 'grid',
        gap: '6',
        maxWidth: '6xl',
      })}
    >
      <div
        className={css({
          fontSize: 'sm',
          color: 'text.muted',
        })}
      >
        Top table uses automatic per-column domain with logarithmic scaling.
        Bottom table overrides to linear scaling with a fixed domain.
      </div>
      <DataTable
        table={logTable}
        isLoading={false}
        getRowKey={(row: Row) => `${row.chain}:${row.symbol}`}
      />
      <DataTable
        table={linearTable}
        isLoading={false}
        getRowKey={(row: Row) => `linear:${row.chain}:${row.symbol}`}
      />
    </div>
  );
};
