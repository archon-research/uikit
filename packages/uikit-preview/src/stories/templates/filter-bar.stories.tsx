import {
  Button,
  SearchInput,
  Select,
  ThemeProvider,
  ToggleGroup,
} from '@archon-research/design-system';
import { useMemo, useState } from 'react';

import { css } from '../../../styled-system/css';
import { segmentedControl } from '../../../styled-system/recipes';

export default {
  title: 'Templates/Control-Rich Filter Bar',
};

type Position = {
  id: string;
  protocol: string;
  chain: string;
  risk: 'low' | 'medium' | 'high';
  amountUsd: number;
};

const positions: Position[] = [
  {
    id: '1',
    protocol: 'Lido',
    chain: 'Ethereum',
    risk: 'low',
    amountUsd: 4560000,
  },
  {
    id: '2',
    protocol: 'Aave',
    chain: 'Ethereum',
    risk: 'medium',
    amountUsd: 2340000,
  },
  {
    id: '3',
    protocol: 'Curve',
    chain: 'Arbitrum',
    risk: 'medium',
    amountUsd: 1890000,
  },
  {
    id: '4',
    protocol: 'Compound',
    chain: 'Arbitrum',
    risk: 'high',
    amountUsd: 890000,
  },
  {
    id: '5',
    protocol: 'Balancer',
    chain: 'Polygon',
    risk: 'high',
    amountUsd: 320000,
  },
];

const pageClassName = css({
  minHeight: '100vh',
  p: '6',
  backgroundColor: 'surface.default',
  color: 'text.default',
});

const stackClassName = css({
  maxWidth: '6xl',
  marginInline: 'auto',
  display: 'grid',
  gap: '5',
});

const panelClassName = css({
  borderColor: 'border.subtle',
  borderRadius: 'lg',
  borderStyle: 'solid',
  borderWidth: '1px',
  backgroundColor: 'surface.default',
  overflow: 'hidden',
});

const barClassName = css({
  p: '4',
  display: 'grid',
  gap: '3',
  borderBottomColor: 'border.subtle',
  borderBottomStyle: 'solid',
  borderBottomWidth: '1px',
});

const controlGridClassName = css({
  display: 'grid',
  gridTemplateColumns: '2fr 1fr 1fr auto',
  gap: '3',
  alignItems: 'end',
  '@media (max-width: 1000px)': {
    gridTemplateColumns: '1fr',
  },
});

const labelClassName = css({
  color: 'text.muted',
  fontSize: 'sm',
  fontWeight: 'medium',
  lineHeight: '1.4',
});

const fieldClassName = css({
  display: 'grid',
  gap: '2',
});

const summaryClassName = css({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  gap: '3',
  flexWrap: 'wrap',
  color: 'text.muted',
  fontSize: 'sm',
});

const resultsClassName = css({
  p: '4',
  display: 'grid',
  gap: '2',
});

const resultRowClassName = css({
  display: 'flex',
  justifyContent: 'space-between',
  alignItems: 'center',
  borderColor: 'border.subtle',
  borderRadius: 'md',
  borderStyle: 'solid',
  borderWidth: '1px',
  p: '3',
});

const riskSegments = segmentedControl();

export const Default = () => {
  const [query, setQuery] = useState('');
  const [chain, setChain] = useState('all');
  const [risk, setRisk] = useState<'all' | 'low' | 'medium' | 'high'>('all');

  const filtered = useMemo(() => {
    return positions.filter((position) => {
      const matchesQuery =
        query.trim().length === 0 ||
        position.protocol.toLowerCase().includes(query.toLowerCase()) ||
        position.chain.toLowerCase().includes(query.toLowerCase());
      const matchesChain = chain === 'all' || position.chain === chain;
      const matchesRisk = risk === 'all' || position.risk === risk;
      return matchesQuery && matchesChain && matchesRisk;
    });
  }, [query, chain, risk]);

  const totalShown = filtered.reduce((acc, row) => acc + row.amountUsd, 0);

  return (
    <ThemeProvider>
      <div className={pageClassName}>
        <div className={stackClassName}>
          <section className={panelClassName}>
            <div className={barClassName}>
              <div className={css({ display: 'grid', gap: '2' })}>
                <h2 className={css({ fontSize: 'md', fontWeight: 'semibold' })}>
                  Portfolio Filters
                </h2>
                <p className={css({ color: 'text.muted', fontSize: 'sm' })}>
                  Combine search, chain selection, and risk segmentation to
                  narrow the allocation view.
                </p>
              </div>

              <div className={controlGridClassName}>
                <div className={fieldClassName}>
                  <label className={labelClassName} htmlFor="filter-query">
                    Search protocol or chain
                  </label>
                  <SearchInput
                    id="filter-query"
                    value={query}
                    onValueChange={setQuery}
                    placeholder="Search positions..."
                    options={positions.map((item) => item.protocol)}
                  />
                </div>

                <div className={fieldClassName}>
                  <label className={labelClassName} htmlFor="filter-chain">
                    Chain
                  </label>
                  <Select
                    id="filter-chain"
                    value={chain}
                    onChange={(event) => setChain(event.target.value)}
                  >
                    <option value="all">All chains</option>
                    <option value="Ethereum">Ethereum</option>
                    <option value="Arbitrum">Arbitrum</option>
                    <option value="Polygon">Polygon</option>
                  </Select>
                </div>

                <div className={fieldClassName}>
                  <span className={labelClassName}>Risk</span>
                  <ToggleGroup.Root
                    className={riskSegments.group}
                    value={[risk]}
                    onValueChange={(value) => {
                      const next = value[0] as
                        | 'all'
                        | 'low'
                        | 'medium'
                        | 'high'
                        | undefined;
                      setRisk(next ?? 'all');
                    }}
                    aria-label="Filter by risk"
                  >
                    <ToggleGroup.Item className={riskSegments.item} value="all">
                      All
                    </ToggleGroup.Item>
                    <ToggleGroup.Item className={riskSegments.item} value="low">
                      Low
                    </ToggleGroup.Item>
                    <ToggleGroup.Item
                      className={riskSegments.item}
                      value="medium"
                    >
                      Med
                    </ToggleGroup.Item>
                    <ToggleGroup.Item
                      className={riskSegments.item}
                      value="high"
                    >
                      High
                    </ToggleGroup.Item>
                  </ToggleGroup.Root>
                </div>

                <div className={css({ display: 'flex', gap: '2' })}>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => {
                      setQuery('');
                      setChain('all');
                      setRisk('all');
                    }}
                  >
                    Clear
                  </Button>
                  <Button size="sm">Apply</Button>
                </div>
              </div>

              <div className={summaryClassName}>
                <span>
                  Showing {filtered.length} of {positions.length} positions
                </span>
                <span>
                  Total visible value: ${totalShown.toLocaleString('en-US')}
                </span>
              </div>
            </div>

            <div className={resultsClassName}>
              {filtered.map((row) => (
                <article className={resultRowClassName} key={row.id}>
                  <div>
                    <strong>{row.protocol}</strong>
                    <p className={css({ color: 'text.muted', fontSize: 'sm' })}>
                      {row.chain} · {row.risk} risk
                    </p>
                  </div>
                  <strong>${row.amountUsd.toLocaleString('en-US')}</strong>
                </article>
              ))}
              {filtered.length === 0 && (
                <div
                  className={css({
                    borderColor: 'border.subtle',
                    borderStyle: 'dashed',
                    borderWidth: '1px',
                    borderRadius: 'md',
                    p: '5',
                    textAlign: 'center',
                    color: 'text.muted',
                  })}
                >
                  No positions match the active filters.
                </div>
              )}
            </div>
          </section>
        </div>
      </div>
    </ThemeProvider>
  );
};
