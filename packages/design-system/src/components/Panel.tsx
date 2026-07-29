import { type CSSProperties, type HTMLAttributes, type ReactNode } from 'react';

/**
 * The design-system package builds with `tsc` and ships no generated
 * `styled-system`, so this component applies recipe styling by its stable,
 * deterministic Panda class names rather than importing `css()`/recipe fns.
 * Panda conventions: base = `${className}`; a recipe variant =
 * `${className}--${key}_${value}`.
 *
 * Panel composes the EXISTING `panelSection` and `sectionHeading` recipes
 * (registered in the preset + staticCss); it owns no recipe of its own. The
 * residual header layout (row / heading group / meta / actions) is not covered
 * by either recipe, so — following the `SurfaceMessage` precedent for a
 * recipe-free, build-safe skin — it is expressed with inline styles that
 * reference Panda's generated token custom properties (with literal fallbacks)
 * rather than hard-coded design values.
 */
const cx = (...classes: Array<string | false | null | undefined>): string =>
  classes.filter(Boolean).join(' ');

const headerRowStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  gap: 'var(--spacing-3, 0.75rem)',
};

const trailingStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--spacing-3, 0.75rem)',
  flexShrink: 0,
};

const metaStyle: CSSProperties = {
  fontSize: 'var(--font-sizes-sm, 0.875rem)',
  lineHeight: 'var(--line-heights-relaxed, 1.625)',
  color: 'var(--colors-text-muted, #667085)',
};

const actionsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 'var(--spacing-2, 0.5rem)',
  flexShrink: 0,
};

export type PanelSurface = 'canvas' | 'raised' | 'recessed';
export type PanelDensity = 'compact' | 'normal';
export type PanelHeadingSpacing = 'normal' | 'roomy';
export type PanelTitleTransform = 'none' | 'upper';

export type PanelProps = HTMLAttributes<HTMLDivElement> & {
  /** Section label rendered via the `sectionHeading` recipe. */
  title?: ReactNode;
  /** Secondary, muted line rendered beneath the title. */
  meta?: ReactNode;
  /** Trailing controls aligned to the end of the header row. */
  actions?: ReactNode;
  /**
   * Surface ramp step. A Panel is a raised container by definition, so it
   * defaults to `raised` (surface.default) even though the bare
   * `panelSection` recipe default stays `recessed` for back-compat.
   */
  surface?: PanelSurface;
  density?: PanelDensity;
  headingSpacing?: PanelHeadingSpacing;
  /**
   * Case treatment for the title via the `sectionHeading` `transform` variant.
   * Defaults to `none` (no transform) so existing titles render unchanged;
   * `upper` renders an uppercase, wider-tracked micro-label.
   */
  titleTransform?: PanelTitleTransform;
};

export function Panel({
  title,
  meta,
  actions,
  surface = 'raised',
  density = 'normal',
  headingSpacing = 'normal',
  titleTransform = 'none',
  className,
  children,
  ...rest
}: PanelProps) {
  const rootClass = cx(
    'panelSection',
    `panelSection--surface_${surface}`,
    `panelSection--density_${density}`,
    className,
  );

  const headingClass = cx(
    'sectionHeading',
    `sectionHeading--spacing_${headingSpacing}`,
    titleTransform !== 'none' && `sectionHeading--transform_${titleTransform}`,
  );

  const hasHeader = title != null || meta != null || actions != null;

  return (
    <div
      {...rest}
      className={rootClass}
      data-scope="panel"
      data-part="root"
      data-surface={surface}
      data-density={density}
    >
      {hasHeader ? (
        <div style={headerRowStyle} data-part="header">
          {title != null ? (
            <div className={headingClass} data-part="title">
              {title}
            </div>
          ) : null}
          {meta != null || actions != null ? (
            <div style={trailingStyle} data-part="header-trailing">
              {meta != null ? (
                <div style={metaStyle} data-part="meta">
                  {meta}
                </div>
              ) : null}
              {actions != null ? (
                <div style={actionsStyle} data-part="actions">
                  {actions}
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      ) : null}
      {children}
    </div>
  );
}
