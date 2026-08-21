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
export type PanelAccent = 'neutral' | 'success' | 'warning' | 'critical';
export type PanelRadius = 'none' | 'sm' | 'md' | 'lg';

/** Per-slot className escape hatch for {@link Panel}. */
export type PanelSlotClassNames = {
  root?: string;
  header?: string;
  title?: string;
  trailing?: string;
  meta?: string;
  actions?: string;
  body?: string;
};

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

/**
 * The native `title` attribute is omitted from the base, not intersected with:
 * `title` here is the panel's header heading. Intersecting instead silently
 * collapsed this `ReactNode` to `string` (`ReactNode & string`), so a heading
 * carrying an icon or a `Badge` did not type-check — and a consumer's tooltip
 * string would have been consumed as the heading. Put a frame tooltip on a
 * wrapper element.
 */
export type PanelProps = Omit<HTMLAttributes<HTMLDivElement>, 'title'> & {
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
  /**
   * Leading-edge state stripe via the `panel` `accent` slot variant, mirroring
   * `StatTile`'s `accent`. Off by default (no stripe, unchanged frame). A tone
   * renders a 3px colored left border; keep the state in the title/body too — an
   * accent never carries it alone.
   */
  accent?: PanelAccent;
  /**
   * Runtime hue for the accent stripe (any CSS color, e.g. an instrument's
   * `var(--...)`). Applied as an inline `border-left-color` that overrides the
   * `accent` tone color, and turns the stripe on (width) even without `accent`.
   */
  accentColor?: string;
  /**
   * Corner radius via the `panel` `radius` slot variant. Defaults to `md`
   * (unchanged); `none` squares the frame.
   */
  radius?: PanelRadius;
  /**
   * Let the header wrap when the title and trailing block can't share a line,
   * instead of forcing the panel wider. Off by default.
   */
  headerWrap?: boolean;
  /**
   * Per-slot `className` escape hatch, merged onto each slot's classes — so a
   * consumer can style a slot (`header`, `meta`, …) without reaching in through
   * a Panda class-name substring selector.
   */
  classNames?: PanelSlotClassNames;
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
  accent,
  accentColor,
  radius = 'md',
  headerWrap = false,
  classNames,
  className,
  style,
  children,
  ...rest
}: PanelProps) {
  const hasHeader = title != null || meta != null || actions != null;
  const stateCopy = state != null ? PANEL_STATE_COPY[state] : null;
  // A runtime color turns the stripe on even without an explicit `accent` tone
  // (defaulting to `neutral` for the border width); the inline color then wins.
  const resolvedAccent = accent ?? (accentColor != null ? 'neutral' : null);
  const mergedStyle =
    accentColor != null ? { borderLeftColor: accentColor, ...style } : style;

  return (
    <div
      {...rest}
      className={cx(
        'panel__root',
        `panel__root--surface_${surface}`,
        `panel__root--density_${density}`,
        resolvedAccent && `panel__root--accent_${resolvedAccent}`,
        radius !== 'md' && `panel__root--radius_${radius}`,
        className,
        classNames?.root,
      )}
      style={mergedStyle}
      data-scope="panel"
      data-part="root"
      data-surface={surface}
      data-density={density}
      data-panel-state={state}
      data-accent={resolvedAccent ?? undefined}
    >
      {hasHeader ? (
        <div
          className={cx(
            'panel__header',
            headerWrap && 'panel__header--headerWrap_true',
            classNames?.header,
          )}
          data-part="header"
        >
          {title != null ? (
            <div
              className={cx(
                'panel__title',
                titleTransform !== 'none' &&
                  `panel__title--titleTransform_${titleTransform}`,
                titleSize !== 'md' && `panel__title--titleSize_${titleSize}`,
                classNames?.title,
              )}
              data-part="title"
            >
              {title}
            </div>
          ) : null}
          {meta != null || actions != null ? (
            <div
              className={cx('panel__trailing', classNames?.trailing)}
              data-part="trailing"
            >
              {meta != null ? (
                <div
                  className={cx(
                    'panel__meta',
                    metaSize !== 'md' && `panel__meta--metaSize_${metaSize}`,
                    classNames?.meta,
                  )}
                  data-part="meta"
                >
                  {meta}
                </div>
              ) : null}
              {actions != null ? (
                <div
                  className={cx('panel__actions', classNames?.actions)}
                  data-part="actions"
                >
                  {actions}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
      <div className={cx('panel__body', classNames?.body)} data-part="body">
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
