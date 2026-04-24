import { ThemeProvider } from '@archon-research/design-system';

import tokensSpec from '../../static/tokens/spec/tokens.json';
import semanticTokensSpec from '../../static/tokens/spec/semantic-tokens.json';
import patternsSpec from '../../static/tokens/spec/patterns.json';
import recipesSpec from '../../static/tokens/spec/recipes.json';
import textStylesSpec from '../../static/tokens/spec/text-styles.json';
import layerStylesSpec from '../../static/tokens/spec/layer-styles.json';
import conditionsSpec from '../../static/tokens/spec/conditions.json';
import animationStylesSpec from '../../static/tokens/spec/animation-styles.json';
import keyframesSpec from '../../static/tokens/spec/keyframes.json';
import colorPaletteSpec from '../../static/tokens/spec/color-palette.json';
import { css } from '../../styled-system/css';

export default {
  title: 'Tokens',
};

type TokenValue = {
  name: string;
  value: string;
  cssVar?: string;
};

type SemanticConditionValue = {
  condition: string;
  value: string;
};

type SemanticTokenValue = {
  name: string;
  values: SemanticConditionValue[];
  cssVar?: string;
};

type TokenGroup = {
  type: string;
  values: TokenValue[];
};

type SemanticGroup = {
  type: string;
  values: SemanticTokenValue[];
};

const shellClassName = css({
  color: 'text.default',
  display: 'grid',
  fontFamily: 'sans',
  gap: '6',
  maxWidth: '6xl',
  p: '6',
});

const mutedClassName = css({
  color: 'text.muted',
  fontSize: 'sm',
  lineHeight: '1.6',
});

const cardClassName = css({
  bg: 'surface.default',
  borderColor: 'border.subtle',
  borderRadius: 'lg',
  borderStyle: 'solid',
  borderWidth: '1px',
  p: '4',
});

const tableClassName = css({
  borderCollapse: 'collapse',
  fontSize: 'sm',
  width: '100%',
  '& th': {
    borderBottomColor: 'border.subtle',
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
    color: 'text.muted',
    fontWeight: 'semibold',
    px: '2',
    py: '2',
    textAlign: 'left',
  },
  '& td': {
    borderBottomColor: 'border.subtle',
    borderBottomStyle: 'solid',
    borderBottomWidth: '1px',
    px: '2',
    py: '2',
    verticalAlign: 'top',
  },
  '& tbody tr:last-child td': {
    borderBottomWidth: '0',
  },
});

const swatchClassName = css({
  borderColor: 'border.subtle',
  borderRadius: 'sm',
  borderStyle: 'solid',
  borderWidth: '1px',
  height: '7',
  minWidth: '16',
});

const linkClassName = css({
  color: 'blue.600',
  fontSize: 'sm',
  textDecoration: 'underline',
  textUnderlineOffset: '2px',
  _dark: {
    color: 'blue.300',
  },
});

const allSpecs = [
  { fileName: 'tokens.json', spec: tokensSpec },
  { fileName: 'semantic-tokens.json', spec: semanticTokensSpec },
  { fileName: 'patterns.json', spec: patternsSpec },
  { fileName: 'recipes.json', spec: recipesSpec },
  { fileName: 'text-styles.json', spec: textStylesSpec },
  { fileName: 'layer-styles.json', spec: layerStylesSpec },
  { fileName: 'conditions.json', spec: conditionsSpec },
  { fileName: 'animation-styles.json', spec: animationStylesSpec },
  { fileName: 'keyframes.json', spec: keyframesSpec },
  { fileName: 'color-palette.json', spec: colorPaletteSpec },
];

const toBlobUrl = (payload: unknown) =>
  URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));

const tokensGroups = (tokensSpec.data as TokenGroup[]).filter((group) => group.values.length > 0);

const semanticGroups = (semanticTokensSpec.data as SemanticGroup[]).filter(
  (group) => group.values.length > 0,
);

const colors = tokensGroups.find((group) => group.type === 'colors')?.values ?? [];
const spacing = tokensGroups.find((group) => group.type === 'spacing')?.values ?? [];
const sizes = tokensGroups.find((group) => group.type === 'sizes')?.values ?? [];

const toPixels = (value: string) => {
  if (value.endsWith('rem')) {
    const numeric = Number.parseFloat(value.replace('rem', ''));
    if (!Number.isNaN(numeric)) {
      return `${Math.round(numeric * 16)}px`;
    }
  }

  if (value.endsWith('px')) {
    return value;
  }

  return '-';
};

const toScaleNumber = (name: string) => {
  const numeric = Number.parseFloat(name);
  return Number.isNaN(numeric) ? Number.POSITIVE_INFINITY : numeric;
};

const tokenScaleSort = (a: TokenValue, b: TokenValue) => {
  const aValue = toScaleNumber(a.name);
  const bValue = toScaleNumber(b.name);

  if (aValue === bValue) {
    return a.name.localeCompare(b.name);
  }

  return aValue - bValue;
};

export const Overview = () => (
  <ThemeProvider>
    <div className={shellClassName}>
      <div>
        <h2>Token source files</h2>
        <p className={mutedClassName}>
          Source of truth comes from Panda Spec JSON. Each file below links to an inline JSON blob.
        </p>
      </div>

      <div className={cardClassName}>
        <table className={tableClassName}>
          <thead>
            <tr>
              <th>Spec File</th>
              <th>Type</th>
              <th>Entries</th>
              <th>JSON</th>
            </tr>
          </thead>
          <tbody>
            {allSpecs.map(({ fileName, spec }) => {
              const isArray = Array.isArray((spec as { data?: unknown }).data);
              const count = isArray
                ? ((spec as { data: unknown[] }).data?.length ?? 0)
                : Object.keys((spec as { data?: Record<string, unknown> }).data ?? {}).length;

              return (
                <tr key={fileName}>
                  <td>{fileName}</td>
                  <td>{(spec as { type?: string }).type ?? 'unknown'}</td>
                  <td>{count}</td>
                  <td>
                    <a className={linkClassName} href={toBlobUrl(spec)} target="_blank" rel="noreferrer">
                      Open JSON
                    </a>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  </ThemeProvider>
);

export const Colors = () => (
  <ThemeProvider>
    <div className={shellClassName}>
      <div>
        <h2>Colors</h2>
        <p className={mutedClassName}>Base color tokens rendered from tokens.json.</p>
      </div>

      <div className={cardClassName}>
        <table className={tableClassName}>
          <thead>
            <tr>
              <th>Token</th>
              <th>Preview</th>
              <th>Value</th>
              <th>CSS Var</th>
            </tr>
          </thead>
          <tbody>
            {colors.map((entry) => (
              <tr key={entry.name}>
                <td>{entry.name}</td>
                <td>
                  <div className={swatchClassName} style={{ background: entry.value }} />
                </td>
                <td>{entry.value}</td>
                <td>{entry.cssVar ?? '-'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  </ThemeProvider>
);

export const Spacing = () => {
  const sorted = [...spacing].sort(tokenScaleSort);

  return (
    <ThemeProvider>
      <div className={shellClassName}>
        <div>
          <h2>Spacing</h2>
          <p className={mutedClassName}>
            Granular spacing scale with rendered bars, aligned with Panda Studio behavior.
          </p>
        </div>

        <div className={cardClassName}>
          <table className={tableClassName}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Size</th>
                <th>Pixels</th>
                <th>Render</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((entry) => {
                const px = toPixels(entry.value);

                return (
                  <tr key={entry.name}>
                    <td>{entry.name}</td>
                    <td>{entry.value}</td>
                    <td>{px}</td>
                    <td>
                      <div
                        className={css({
                          bg: 'rose.200',
                          borderRadius: 'sm',
                          height: '4',
                          minWidth: '1',
                        })}
                        style={{ width: px !== '-' ? px : '0px' }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </ThemeProvider>
  );
};

export const Sizes = () => {
  const sorted = [...sizes].sort(tokenScaleSort);

  return (
    <ThemeProvider>
      <div className={shellClassName}>
        <div>
          <h2>Sizes</h2>
          <p className={mutedClassName}>
            Size scale rendered with visual width bars for fast comparison.
          </p>
        </div>

        <div className={cardClassName}>
          <table className={tableClassName}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Size</th>
                <th>Pixels</th>
                <th>Render</th>
              </tr>
            </thead>
            <tbody>
              {sorted.map((entry) => {
                const px = toPixels(entry.value);

                return (
                  <tr key={entry.name}>
                    <td>{entry.name}</td>
                    <td>{entry.value}</td>
                    <td>{px}</td>
                    <td>
                      <div
                        className={css({
                          bg: 'sky.200',
                          borderRadius: 'sm',
                          height: '4',
                          minWidth: '1',
                        })}
                        style={{ width: px !== '-' ? px : '0px' }}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </ThemeProvider>
  );
};

export const SemanticTokens = () => (
  <ThemeProvider>
    <div className={shellClassName}>
      <div>
        <h2>Semantic tokens</h2>
        <p className={mutedClassName}>Condition-aware tokens rendered from semantic-tokens.json.</p>
      </div>

      {semanticGroups.map((group) => (
        <div className={cardClassName} key={group.type}>
          <h3>{group.type}</h3>
          <table className={tableClassName}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Base</th>
                <th>Dark</th>
                <th>CSS Var</th>
              </tr>
            </thead>
            <tbody>
              {group.values.map((entry) => {
                const base = entry.values.find((value) => value.condition === 'base')?.value ?? '-';
                const dark = entry.values.find((value) => value.condition === 'dark')?.value ?? '-';

                return (
                  <tr key={entry.name}>
                    <td>{entry.name}</td>
                    <td>{base}</td>
                    <td>{dark}</td>
                    <td>{entry.cssVar ?? '-'}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      ))}
    </div>
  </ThemeProvider>
);
