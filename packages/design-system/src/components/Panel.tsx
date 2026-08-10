import { type HTMLAttributes, type ReactNode } from 'react';

import { SurfaceMessage, type SurfaceMessageTone } from './SurfaceMessage.js';

/**
 * The design-system package builds with `tsc` and ships no generated
 * `styled-system`, so this component applies recipe styling by its stable,
 * deterministic Panda class names rather than importing `css()`/recipe fns.
 * Conventions: slot base = `${className}__${slot}`; a slot variant =
 * `${className}__${slot}--${key}_${value}`.
 *
 * Panel is a self-contained `panel` slot recipe (registered in the preset +
 * staticCss): the bordered frame, the header row (title + trailing meta and
 * actions), and the body block are all class-driven. There are no inline style
 * objects, and it no longer depends on the `panelSection`/`sectionHeading`
 * recipes.
 */
const cx = (...classes: Array<string | false | null | undefined>): string =>
  classes.filter(Boolean).join(' ');

export type PanelSurface = 'canvas' | 'raised' | 'recessed';
export type PanelDensity = 'compact' | 'normal';
export type PanelTitleTransform = 'none' | 'upper';
export type PanelTitleSize = 'md' | 'sm';
export type PanelMetaSize = 'md' | 'sm';

/**
 * A named body state. The four names stay distinct on purpose: `empty`
 * ("nothing recorded here") and `filtered` ("your filter matched nothing") are
 * two different facts and must not collapse into one muted div.
 */
export type PanelState = 'loading' | 'empty' | 'filtered' | 'error';

const PANEL_STATE_TONE: Record<PanelState, SurfaceMessageTone> = {
  loading: 'muted',
  empty: 'dashed',
  filtered: 'muted',
  error: 'critical',
};

const PANEL_STATE_COPY: Record<PanelState, { title: string; body: string }> = {
  loading: { title: 'Loading…', body: 'Fetching data.' },
  empty: { title: 'Nothing here yet', body: 'No records to show.' },
  filtered: {
    title: 'No matches',
    body: 'No records match the current filters.',
  },
  error: {
    title: 'Something went wrong',
    body: 'This section could not be loaded.',
  },
};

export type PanelProps = HTMLAttributes<HTMLDivElement> & {
  /** Section-label heading rendered at the start of the header row. */
  title?: ReactNode;
  /** Secondary, muted line aligned to the end of the header row. */
  meta?: ReactNode;
  /** Trailing controls aligned to the end of the header row. */
  actions?: ReactNode;
  /**
   * Surface ramp step. A Panel is a raised container by definition, so it
   * defaults to `raised` (surface.default).
   */
  surface?: PanelSurface;
  density?: PanelDensity;
  /**
   * Case treatment for the title via the `panel` `titleTransform` slot variant.
   * Defaults to `none` (no transform); `upper` renders an uppercase,
   * wider-tracked micro-label.
   */
  titleTransform?: PanelTitleTransform;
  /**
   * Size of the section-label title via the `panel` `titleSize` slot variant.
   * Defaults to `md` (12px); `sm` renders the label one step smaller (11px)
   * while keeping the weight and tracking consistent.
   */
  titleSize?: PanelTitleSize;
  /**
   * Size of the meta line via the `panel` `metaSize` slot variant. Independent
   * of `density` (which controls padding only), so a roomy panel can still
   * carry a small meta line. Defaults to `md` (14px); `sm` is ~11px.
   */
  metaSize?: PanelMetaSize;
  /**
   * Renders a named body state (`SurfaceMessage`) in place of `children` at the
   * canonical tone for that state, and stamps `data-panel-state` so tests and
   * audits can assert the state was *named* rather than merely blank. Omit for
   * the normal content path. `empty` and `filtered` are deliberately distinct.
   */
  state?: PanelState;
  /** Overrides the default title for `state`. Ignored unless `state` is set. */
  stateTitle?: string;
  /** Overrides the default body for `state`. Ignored unless `state` is set. */
  stateBody?: string;
};

export function Panel({
  title,
  meta,
  actions,
  surface = 'raised',
  density = 'normal',
  titleTransform = 'none',
  titleSize = 'md',
  metaSize = 'md',
  state,
  stateTitle,
  stateBody,
  className,
  children,
  ...rest
}: PanelProps) {
  const hasHeader = title != null || meta != null || actions != null;
  const stateCopy = state != null ? PANEL_STATE_COPY[state] : null;

  return (
    <div
      {...rest}
      className={cx(
        'panel__root',
        `panel__root--surface_${surface}`,
        `panel__root--density_${density}`,
        className,
      )}
      data-scope="panel"
      data-part="root"
      data-surface={surface}
      data-density={density}
      data-panel-state={state}
    >
      {hasHeader ? (
        <div className="panel__header" data-part="header">
          {title != null ? (
            <div
              className={cx(
                'panel__title',
                titleTransform !== 'none' &&
                  `panel__title--titleTransform_${titleTransform}`,
                titleSize !== 'md' && `panel__title--titleSize_${titleSize}`,
              )}
              data-part="title"
            >
              {title}
            </div>
          ) : null}
          {meta != null || actions != null ? (
            <div className="panel__trailing" data-part="trailing">
              {meta != null ? (
                <div
                  className={cx(
                    'panel__meta',
                    metaSize !== 'md' && `panel__meta--metaSize_${metaSize}`,
                  )}
                  data-part="meta"
                >
                  {meta}
                </div>
              ) : null}
              {actions != null ? (
                <div className="panel__actions" data-part="actions">
                  {actions}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
      <div className="panel__body" data-part="body">
        {state != null && stateCopy != null ? (
          <SurfaceMessage
            tone={PANEL_STATE_TONE[state]}
            title={stateTitle ?? stateCopy.title}
            body={stateBody ?? stateCopy.body}
          />
        ) : (
          children
        )}
      </div>
    </div>
  );
}
