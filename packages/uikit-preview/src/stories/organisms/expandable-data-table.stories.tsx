import {
  ExpandableDataTable,
  defineColumns,
  numericColumnMeta,
} from '@archon-research/design-system';
import { useState } from 'react';

import { css } from '../../../styled-system/css';

export default {
  title: 'Organisms/ExpandableDataTable',
};

type Position = {
  id: string;
  venue: string;
  asset: string;
  size: number;
  pnl: number;
};

const POSITIONS: Position[] = [
  { id: 'p-aave-eth', venue: 'Aave', asset: 'ETH', size: 1240000, pnl: 86400 },
  {
    id: 'p-morpho-wbtc',
    venue: 'Morpho',
    asset: 'WBTC',
    size: 980000,
    pnl: -42100,
  },
  {
    id: 'p-spark-usdc',
    venue: 'SparkLend',
    asset: 'USDC',
    size: 620000,
    pnl: 12400,
  },
  { id: 'p-aave-usdt', venue: 'Aave', asset: 'USDT', size: 410000, pnl: 3900 },
  {
    id: 'p-morpho-eth',
    venue: 'Morpho',
    asset: 'ETH',
    size: 260000,
    pnl: -8800,
  },
];

const usd = (n: number) =>
  n.toLocaleString('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  });

const columns = defineColumns<Position>(
  { id: 'venue', accessorKey: 'venue', header: 'Venue' },
  { id: 'asset', accessorKey: 'asset', header: 'Asset' },
  {
    id: 'size',
    accessorKey: 'size',
    header: 'Size',
    cell: (ctx) => usd(ctx.getValue<number>()),
    meta: { ...numericColumnMeta },
  },
  {
    id: 'pnl',
    accessorKey: 'pnl',
    header: 'PnL',
    cell: (ctx) => usd(ctx.getValue<number>()),
    meta: { ...numericColumnMeta },
  },
);

const detailClassName = css({
  display: 'grid',
  gap: '1',
  fontSize: 'sm',
  color: 'text.muted',
});

const frameClassName = css({
  p: '6',
  backgroundColor: 'surface.canvas',
  fontFamily: 'sans',
  color: 'text.default',
});

const renderDetail = (row: Position) => (
  <div className={detailClassName}>
    <div>
      <strong>{row.asset}</strong> on {row.venue}
    </div>
    <div>Notional: {usd(row.size)}</div>
    <div>Unrealized PnL: {usd(row.pnl)}</div>
  </div>
);

// Master/detail: an expandable panel per row. One row is expanded by default so
// the detail panel is visible.
export const Default = () => (
  <div className={frameClassName}>
    <ExpandableDataTable
      data={POSITIONS}
      columns={columns}
      getRowId={(row) => row.id}
      getRowCanExpand={() => true}
      renderDetailRow={renderDetail}
      defaultExpanded={{ 'p-morpho-wbtc': true }}
      enableSorting
      virtualized={false}
    />
  </div>
);

// Virtualized over many rows with a scroll viewport + sticky header.
export const Virtualized = () => {
  const rows: Position[] = Array.from({ length: 60 }, (_, i) => ({
    id: `row-${i}`,
    venue: ['Aave', 'Morpho', 'SparkLend'][i % 3]!,
    asset: ['ETH', 'WBTC', 'USDC', 'USDT'][i % 4]!,
    size: 1000000 - i * 12345,
    pnl: (i % 2 === 0 ? 1 : -1) * (i * 1500 + 500),
  }));
  return (
    <div className={frameClassName}>
      <ExpandableDataTable
        data={rows}
        columns={columns}
        getRowId={(row) => row.id}
        renderDetailRow={renderDetail}
        defaultExpanded={{ 'row-1': true }}
        maxHeight={320}
      />
    </div>
  );
};

// Demonstrates the identity discipline: expand a row, then prepend a new row.
// Because expansion + the virtualizer's getItemKey key off getRowId (not the
// array index), the originally-expanded row stays expanded and keeps its height
// — it doesn't jump to whatever row now sits at the old index.
export const IdentityUnderReorder = () => {
  const [rows, setRows] = useState<Position[]>(POSITIONS);
  let nextId = rows.length;
  return (
    <div className={frameClassName}>
      <button
        type="button"
        className={css({ mb: '3' })}
        onClick={() =>
          setRows((prev) => [
            {
              id: `prepended-${nextId++}`,
              venue: 'New',
              asset: 'DAI',
              size: 100000,
              pnl: 0,
            },
            ...prev,
          ])
        }
      >
        Prepend row
      </button>
      <ExpandableDataTable
        data={rows}
        columns={columns}
        getRowId={(row) => row.id}
        renderDetailRow={renderDetail}
        defaultExpanded={{ 'p-morpho-wbtc': true }}
        virtualized={false}
      />
    </div>
  );
};
