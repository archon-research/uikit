import {
  DataTable,
  SearchInput,
  defineColumns,
  numericColumnMeta,
  useDataTable,
} from '@archon-research/design-system';
import type { SortingState } from '@tanstack/react-table';
import { useEffect, useMemo, useState } from 'react';

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

const alignedColumns = [
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
    meta: {
      align: 'right' as const,
    },
    cell: ({ row }: { row: { original: Row } }) =>
      `$${row.original.amountUsd.toLocaleString('en-US')}`,
  },
];

// Numeric column set: the amount column is both right-aligned and rendered in
// the mono font (tabular figures) so digits line up down the column.
const numericColumns = [
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
    meta: {
      align: 'right' as const,
      mono: true,
    },
    cell: ({ row }: { row: { original: Row } }) =>
      `$${row.original.amountUsd.toLocaleString('en-US')}`,
  },
];

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

export const RightAlignedNumericColumn = () => {
  const table = useDataTable(rows, alignedColumns as never, {
    enableSorting: true,
    enableSearch: true,
  });

  return (
    <div className={wrapperClassName}>
      <div
        className={css({
          fontSize: 'sm',
          color: 'text.muted',
          mb: '4',
        })}
      >
        The numeric "Amount (USD)" column sets{' '}
        <code>meta.align: &apos;right&apos;</code>, right-aligning both its
        header and cells.
      </div>
      <DataTable
        table={table}
        isLoading={false}
        getRowKey={(row: Row) => `${row.chain}:${row.symbol}`}
      />
    </div>
  );
};

export const NumericMonoColumn = () => {
  const table = useDataTable(rows, numericColumns as never, {
    enableSorting: true,
    enableSearch: true,
  });

  return (
    <div className={wrapperClassName}>
      <div
        className={css({
          fontSize: 'sm',
          color: 'text.muted',
          mb: '4',
        })}
      >
        The numeric &quot;Amount (USD)&quot; column sets{' '}
        <code>meta.align: &apos;right&apos;</code> and{' '}
        <code>meta.mono: true</code>, so its body cells render in the mono font
        with tabular figures and the digits align down the column.
      </div>
      <DataTable
        table={table}
        isLoading={false}
        getRowKey={(row: Row) => `${row.chain}:${row.symbol}`}
      />
    </div>
  );
};

export const CompactDensity = () => {
  const comfortableTable = useDataTable(rows, numericColumns as never, {
    enableSorting: true,
    enableSearch: true,
  });
  const compactTable = useDataTable(rows, numericColumns as never, {
    enableSorting: true,
    enableSearch: true,
  });

  return (
    <div
      className={css({
        p: '6',
        display: 'grid',
        gap: '6',
        maxWidth: '5xl',
      })}
    >
      <div className={css({ fontSize: 'sm', color: 'text.muted' })}>
        Top table uses the default <code>density=&quot;comfortable&quot;</code>;
        bottom table uses <code>density=&quot;compact&quot;</code> for genuinely
        dense (~6px vertical) cell padding. Both right-align the numeric column
        and render it in the mono font.
      </div>
      <DataTable
        table={comfortableTable}
        isLoading={false}
        density="comfortable"
        getRowKey={(row: Row) => `comfortable:${row.chain}:${row.symbol}`}
      />
      <DataTable
        table={compactTable}
        isLoading={false}
        density="compact"
        getRowKey={(row: Row) => `compact:${row.chain}:${row.symbol}`}
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

const resizableColumns = [
  {
    accessorKey: 'symbol',
    header: 'Symbol',
    size: 120,
    cell: ({ row }: { row: { original: Row } }) => row.original.symbol,
  },
  {
    accessorKey: 'chain',
    header: 'Chain',
    size: 160,
    cell: ({ row }: { row: { original: Row } }) => row.original.chain,
  },
  {
    accessorKey: 'amountUsd',
    header: 'Amount (USD)',
    size: 160,
    meta: { align: 'right' as const, mono: true },
    cell: ({ row }: { row: { original: Row } }) =>
      `$${row.original.amountUsd.toLocaleString('en-US')}`,
  },
];

export const ColumnResizeReorderPin = () => {
  const table = useDataTable(rows, resizableColumns as never, {
    enableSorting: true,
    enableColumnResizing: true,
  });

  return (
    <div className={wrapperClassName}>
      <div className={css({ fontSize: 'sm', color: 'text.muted', mb: '4' })}>
        Drag a header&apos;s right edge to resize (or focus the handle and use
        the arrow keys), drag a header by its label to reorder, and use the pin
        button to stick a column to the left edge while the table scrolls
        horizontally.
      </div>
      <DataTable
        table={table}
        isLoading={false}
        getRowKey={(row: Row) => `${row.chain}:${row.symbol}`}
        enableColumnReordering
        enableColumnPinning
      />
    </div>
  );
};

export const MultiRowSelection = () => {
  const [selectedRows, setSelectedRows] = useState<Row[]>([]);
  const table = useDataTable(rows, columns as never, {
    enableSorting: true,
    enableRowSelection: true,
  });

  const selectedRowModel = table.getSelectedRowModel();
  useEffect(() => {
    setSelectedRows(selectedRowModel.rows.map((row) => row.original));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [table.getState().rowSelection]);

  return (
    <div className={wrapperClassName}>
      <div className={css({ fontSize: 'sm', color: 'text.muted', mb: '4' })}>
        Checkbox column backed by TanStack's `rowSelection` feature — select
        all, or one row at a time.
      </div>
      <DataTable
        table={table}
        isLoading={false}
        getRowKey={(row: Row) => `${row.chain}:${row.symbol}`}
      />
      <div className={css({ fontSize: 'sm', color: 'text.muted', mt: '4' })}>
        Selected:{' '}
        {selectedRows.length === 0
          ? 'none'
          : selectedRows.map((row) => row.symbol).join(', ')}
      </div>
    </div>
  );
};

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

// The toolbar (opt-in): global search + a column-visibility menu, density and
// full-screen toggles, a selection-count banner, plus copyable cells and a
// trailing row-actions column. One row is pre-selected so the banner shows.
const toolbarColumns = defineColumns<Row>(
  {
    id: 'symbol',
    accessorKey: 'symbol',
    header: 'Symbol',
    cell: (ctx) => ctx.row.original.symbol,
    meta: {
      mono: true,
      copyable: true,
      label: 'Symbol',
      copyValue: (row) => row.symbol,
    },
  },
  {
    id: 'chain',
    accessorKey: 'chain',
    header: 'Chain',
    cell: (ctx) => ctx.row.original.chain,
    meta: { label: 'Chain' },
  },
  {
    id: 'amountUsd',
    accessorKey: 'amountUsd',
    header: 'Amount (USD)',
    cell: (ctx) => `$${ctx.row.original.amountUsd.toLocaleString('en-US')}`,
    meta: { ...numericColumnMeta, label: 'Amount (USD)' },
  },
);

export const Toolbar = () => {
  const table = useDataTable<Row>(rows, toolbarColumns, {
    enableSearch: true,
    enableSorting: true,
    enableRowSelection: true,
    getRowId: (row) => row.symbol,
    defaultRowSelection: { WETH: true },
  });
  return (
    <div className={wrapperClassName}>
      <DataTable
        table={table}
        isLoading={false}
        toolbar
        enableColumnVisibility
        enableDensityToggle
        enableFullScreen
        searchPlaceholder="Search tokens…"
        rowActions={(row) => (
          <button
            type="button"
            aria-label={`Actions for ${row.symbol}`}
            onClick={() => {}}
          >
            ⋯
          </button>
        )}
      />
    </div>
  );
};

// Master/detail: `useDataTable({ getRowCanExpand })` + a `renderDetailPanel`
// prop expand a row into a detail panel below it. A stable `getRowId` keeps a
// row expanded across sorts/reorders; one row starts expanded here.
export const ExpandableRows = () => {
  const table = useDataTable<Row>(rows, toolbarColumns, {
    enableSorting: true,
    getRowId: (row) => row.symbol,
    getRowCanExpand: () => true,
    defaultExpanded: { WETH: true },
  });
  return (
    <div className={wrapperClassName}>
      <DataTable
        table={table}
        isLoading={false}
        renderDetailPanel={(row) => (
          <div
            className={css({
              display: 'grid',
              gap: '1',
              fontSize: 'sm',
              color: 'text.muted',
            })}
          >
            <div>
              <strong>{row.symbol}</strong> on {row.chain}
            </div>
            <div>Amount: ${row.amountUsd.toLocaleString('en-US')}</div>
          </div>
        )}
      />
    </div>
  );
};
