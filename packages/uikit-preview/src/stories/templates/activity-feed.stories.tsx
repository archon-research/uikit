import {
  Badge,
  Button,
  ThemeProvider,
  ThemeToggle,
  ToggleGroup,
} from '@archon-research/design-system';
import { useMemo, useState } from 'react';

import { css } from '../../../styled-system/css';
import { segmentedControl } from '../../../styled-system/recipes';

export default {
  title: 'Templates/Activity Feed',
};

type FeedEvent = {
  id: string;
  actor: string;
  action: string;
  target: string;
  timestamp: string;
  group: 'today' | 'yesterday' | 'week';
  severity: 'info' | 'warning' | 'critical';
  meta: string;
};

const events: FeedEvent[] = [
  {
    id: 'evt-1',
    actor: 'Ops Bot',
    action: 'rebalanced',
    target: 'Lido position',
    timestamp: '2 min ago',
    group: 'today',
    severity: 'info',
    meta: 'Moved $120k into target weight band',
  },
  {
    id: 'evt-2',
    actor: 'Risk Engine',
    action: 'flagged',
    target: 'Compound exposure',
    timestamp: '19 min ago',
    group: 'today',
    severity: 'warning',
    meta: 'Position exceeds configured volatility threshold',
  },
  {
    id: 'evt-3',
    actor: 'Scheduler',
    action: 'completed',
    target: 'daily snapshot',
    timestamp: '1h ago',
    group: 'today',
    severity: 'info',
    meta: 'Portfolio metrics persisted successfully',
  },
  {
    id: 'evt-4',
    actor: 'Ops Bot',
    action: 'cancelled',
    target: 'stale rebalance plan',
    timestamp: 'Yesterday, 18:12',
    group: 'yesterday',
    severity: 'warning',
    meta: 'Market move invalidated target allocation',
  },
  {
    id: 'evt-5',
    actor: 'Alert Router',
    action: 'escalated',
    target: 'wallet risk event',
    timestamp: 'Yesterday, 09:42',
    group: 'yesterday',
    severity: 'critical',
    meta: 'Manual review required for flagged transfer',
  },
  {
    id: 'evt-6',
    actor: 'Risk Engine',
    action: 'resolved',
    target: 'Aave health check',
    timestamp: '4 days ago',
    group: 'week',
    severity: 'info',
    meta: 'Safety buffer recovered above policy minimum',
  },
];

const pageClassName = css({
  minHeight: '100vh',
  width: '100%',
  p: '6',
  backgroundColor: 'surface.default',
  color: 'text.default',
});

const layoutClassName = css({
  display: 'grid',
  gridTemplateColumns: '1fr 320px',
  gap: '6',
  maxWidth: '7xl',
  marginInline: 'auto',
  '@media (max-width: 1000px)': {
    gridTemplateColumns: '1fr',
  },
});

const panelClassName = css({
  borderColor: 'border.subtle',
  borderRadius: 'lg',
  borderStyle: 'solid',
  borderWidth: '1px',
  backgroundColor: 'surface.default',
  overflow: 'hidden',
});

const headerClassName = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  p: '4',
  borderBottomColor: 'border.subtle',
  borderBottomStyle: 'solid',
  borderBottomWidth: '1px',
});

const sectionTitleClassName = css({
  fontSize: 'md',
  fontWeight: 'semibold',
  lineHeight: '1.3',
});

const mutedTextClassName = css({
  color: 'text.muted',
  fontSize: 'sm',
  lineHeight: '1.5',
});

const groupClassName = css({
  p: '4',
  display: 'grid',
  gap: '3',
});

const groupHeadingClassName = css({
  color: 'text.muted',
  fontSize: 'xs',
  fontWeight: 'semibold',
  letterSpacing: '0.5px',
  textTransform: 'uppercase',
});

const itemClassName = css({
  borderColor: 'border.subtle',
  borderRadius: 'md',
  borderStyle: 'solid',
  borderWidth: '1px',
  p: '3',
  display: 'grid',
  gap: '2',
  backgroundColor: 'surface.default',
});

const itemTitleClassName = css({
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: '3',
});

const sidebarClassName = css({
  display: 'grid',
  gap: '4',
  alignContent: 'start',
});

const severityToTone = {
  info: 'default',
  warning: 'warning',
  critical: 'critical',
} as const;

const groupedEvents = (filtered: FeedEvent[]) => ({
  today: filtered.filter((item) => item.group === 'today'),
  yesterday: filtered.filter((item) => item.group === 'yesterday'),
  week: filtered.filter((item) => item.group === 'week'),
});

export const Default = () => {
  const [view, setView] = useState<'all' | 'warning' | 'critical'>('all');

  const filtered = useMemo(() => {
    if (view === 'all') return events;
    return events.filter((event) => event.severity === view);
  }, [view]);

  const groups = groupedEvents(filtered);
  const segments = segmentedControl();

  return (
    <ThemeProvider>
      <div className={pageClassName}>
        <div className={layoutClassName}>
          <section className={panelClassName}>
            <div className={headerClassName}>
              <div>
                <h2 className={sectionTitleClassName}>Activity Feed</h2>
                <p className={mutedTextClassName}>
                  Grouped event stream with operational metadata.
                </p>
              </div>
              <ThemeToggle />
            </div>

            <div
              className={css({
                p: '4',
                borderBottom: '1px solid',
                borderBottomColor: 'border.subtle',
              })}
            >
              <ToggleGroup.Root
                className={segments.group}
                value={[view]}
                onValueChange={(value) => {
                  const next = value[0] as
                    | 'all'
                    | 'warning'
                    | 'critical'
                    | undefined;
                  setView(next ?? 'all');
                }}
                aria-label="Filter feed by severity"
              >
                <ToggleGroup.Item className={segments.item} value="all">
                  All
                </ToggleGroup.Item>
                <ToggleGroup.Item className={segments.item} value="warning">
                  Warning
                </ToggleGroup.Item>
                <ToggleGroup.Item className={segments.item} value="critical">
                  Critical
                </ToggleGroup.Item>
              </ToggleGroup.Root>
            </div>

            <div>
              {groups.today.length > 0 && (
                <div className={groupClassName}>
                  <div className={groupHeadingClassName}>Today</div>
                  {groups.today.map((event) => (
                    <article className={itemClassName} key={event.id}>
                      <div className={itemTitleClassName}>
                        <strong>
                          {event.actor} {event.action} {event.target}
                        </strong>
                        <Badge tone={severityToTone[event.severity]} size="sm">
                          {event.severity}
                        </Badge>
                      </div>
                      <p className={mutedTextClassName}>{event.meta}</p>
                      <span
                        className={css({ color: 'text.muted', fontSize: 'xs' })}
                      >
                        {event.timestamp}
                      </span>
                    </article>
                  ))}
                </div>
              )}

              {groups.yesterday.length > 0 && (
                <div className={groupClassName}>
                  <div className={groupHeadingClassName}>Yesterday</div>
                  {groups.yesterday.map((event) => (
                    <article className={itemClassName} key={event.id}>
                      <div className={itemTitleClassName}>
                        <strong>
                          {event.actor} {event.action} {event.target}
                        </strong>
                        <Badge tone={severityToTone[event.severity]} size="sm">
                          {event.severity}
                        </Badge>
                      </div>
                      <p className={mutedTextClassName}>{event.meta}</p>
                      <span
                        className={css({ color: 'text.muted', fontSize: 'xs' })}
                      >
                        {event.timestamp}
                      </span>
                    </article>
                  ))}
                </div>
              )}

              {groups.week.length > 0 && (
                <div className={groupClassName}>
                  <div className={groupHeadingClassName}>Earlier This Week</div>
                  {groups.week.map((event) => (
                    <article className={itemClassName} key={event.id}>
                      <div className={itemTitleClassName}>
                        <strong>
                          {event.actor} {event.action} {event.target}
                        </strong>
                        <Badge tone={severityToTone[event.severity]} size="sm">
                          {event.severity}
                        </Badge>
                      </div>
                      <p className={mutedTextClassName}>{event.meta}</p>
                      <span
                        className={css({ color: 'text.muted', fontSize: 'xs' })}
                      >
                        {event.timestamp}
                      </span>
                    </article>
                  ))}
                </div>
              )}
            </div>
          </section>

          <aside className={sidebarClassName}>
            <section className={panelClassName}>
              <div className={headerClassName}>
                <h3 className={sectionTitleClassName}>Feed Controls</h3>
              </div>
              <div className={css({ p: '4', display: 'grid', gap: '3' })}>
                <p className={mutedTextClassName}>
                  Use filters to narrow to severe incidents while preserving
                  timeline context.
                </p>
                <Button size="sm" variant="outline">
                  Mark All Read
                </Button>
                <Button size="sm">Create Alert Rule</Button>
              </div>
            </section>

            <section className={panelClassName}>
              <div className={headerClassName}>
                <h3 className={sectionTitleClassName}>Highlights</h3>
              </div>
              <div className={css({ p: '4', display: 'grid', gap: '2' })}>
                <p className={mutedTextClassName}>
                  2 warnings require follow-up
                </p>
                <p className={mutedTextClassName}>
                  1 critical event escalated today
                </p>
              </div>
            </section>
          </aside>
        </div>
      </div>
    </ThemeProvider>
  );
};
