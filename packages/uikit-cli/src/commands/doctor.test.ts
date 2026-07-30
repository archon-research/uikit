import { describe, expect, it } from 'vitest';

import { SENTINEL_RECIPE_CLASSES, scanGeneratedCss } from './doctor.js';

/** A stylesheet with every sentinel present and only resolved declarations. */
const healthyCss = `
${SENTINEL_RECIPE_CLASSES.map((c) => `.${c} { color: var(--colors-text-default); }`).join('\n')}
.c_text\\.muted { color: var(--colors-text-muted); }
.bg_surface { background: var(--colors-surface-default); }
.stroke_series { stroke: var(--colors-chart-series-primary); }
`;

describe('scanGeneratedCss', () => {
  it('passes a healthy stylesheet', () => {
    const report = scanGeneratedCss(healthyCss);
    expect(report.ok).toBe(true);
    expect(report.issues).toEqual([]);
  });

  it('flags missing static-css sentinels', () => {
    // Drop one sentinel; keep the rest.
    const withoutOne = healthyCss.replace(
      `.${SENTINEL_RECIPE_CLASSES[0]} `,
      '.some_other_class ',
    );
    const report = scanGeneratedCss(withoutOne);
    expect(report.ok).toBe(false);
    const issue = report.issues.find((i) => i.kind === 'missing-static-css');
    expect(issue).toBeDefined();
    expect(issue).toMatchObject({ missing: [SENTINEL_RECIPE_CLASSES[0]] });
  });

  it('flags an unresolved token-path declaration with its line', () => {
    const css = `${healthyCss}\n.c_text\\.subtle { color: text.subtle; }`;
    const report = scanGeneratedCss(css);
    expect(report.ok).toBe(false);
    const issue = report.issues.find((i) => i.kind === 'unresolved-token');
    expect(issue).toMatchObject({ declaration: 'color: text.subtle' });
  });

  it('does not flag resolved var() declarations or class selectors', () => {
    // `.c_text\.subtle` as a *selector* must not be mistaken for a declaration.
    const css = `${healthyCss}\n.c_text\\.subtle { color: var(--colors-text-muted); }`;
    const report = scanGeneratedCss(css);
    expect(report.issues.some((i) => i.kind === 'unresolved-token')).toBe(
      false,
    );
  });

  it('catches an unresolved background token too', () => {
    const css = `${healthyCss}\n.bg_x { background: bg.success; }`;
    const report = scanGeneratedCss(css);
    expect(
      report.issues.some(
        (i) =>
          i.kind === 'unresolved-token' &&
          i.declaration === 'background: bg.success',
      ),
    ).toBe(true);
  });
});
