import { ThemeProvider } from '@archon-research/design-system';
import { useMemo, useState } from 'react';

import tokensSpec from '../../static/tokens/spec/tokens.json';
import semanticTokensSpec from '../../static/tokens/spec/semantic-tokens.json';
import '../../styled-system/styles.css';
import { css } from '../../styled-system/css';

export default {
  title: 'Playground',
};

type TokenValue = {
  name: string;
  value: string;
};

type TokenGroup = {
  type: string;
  values: TokenValue[];
};

type SemanticConditionValue = {
  condition: string;
  value: string;
};

type SemanticTokenValue = {
  name: string;
  values: SemanticConditionValue[];
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
  maxWidth: '5xl',
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

const controlsClassName = css({
  alignItems: 'center',
  display: 'grid',
  gap: '3',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
});

const selectClassName = css({
  bg: 'surface.default',
  borderColor: 'border.subtle',
  borderRadius: 'md',
  borderStyle: 'solid',
  borderWidth: '1px',
  color: 'text.default',
  fontSize: 'sm',
  px: '3',
  py: '2',
});

const previewClassName = css({
  borderColor: 'border.subtle',
  borderRadius: 'md',
  borderStyle: 'solid',
  borderWidth: '1px',
  mt: '4',
  p: '4',
});

const typographySampleClassName = css({
  borderColor: 'border.subtle',
  borderRadius: 'md',
  borderStyle: 'solid',
  borderWidth: '1px',
  p: '4',
});

const tokensGroups = tokensSpec.data as TokenGroup[];
const semanticGroups = semanticTokensSpec.data as SemanticGroup[];

const getTokenGroup = (groupName: string) =>
  tokensGroups.find((group) => group.type === groupName)?.values ?? [];

const semanticColors = semanticGroups.find((group) => group.type === 'colors')?.values ?? [];

const fontSizes = getTokenGroup('fontSizes');
const fontWeights = getTokenGroup('fontWeights');
const lineHeights = getTokenGroup('lineHeights');
const colorTokens = getTokenGroup('colors');

const normalizeHex = (value: string) => {
  const hex = value.trim();
  if (!hex.startsWith('#')) return null;

  if (hex.length === 4) {
    const [r, g, b] = hex.slice(1).split('');
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }

  if (hex.length === 7) return hex.toLowerCase();
  return null;
};

const hexToRgb = (value: string) => {
  const normalized = normalizeHex(value);
  if (!normalized) return null;

  const intValue = Number.parseInt(normalized.slice(1), 16);
  return {
    r: (intValue >> 16) & 255,
    g: (intValue >> 8) & 255,
    b: intValue & 255,
  };
};

const toLinear = (channel: number) => {
  const srgb = channel / 255;
  if (srgb <= 0.03928) {
    return srgb / 12.92;
  }

  return ((srgb + 0.055) / 1.055) ** 2.4;
};

const luminance = (hex: string) => {
  const rgb = hexToRgb(hex);
  if (!rgb) return null;

  return 0.2126 * toLinear(rgb.r) + 0.7152 * toLinear(rgb.g) + 0.0722 * toLinear(rgb.b);
};

const contrastRatio = (foreground: string, background: string) => {
  const fgLuminance = luminance(foreground);
  const bgLuminance = luminance(background);

  if (fgLuminance === null || bgLuminance === null) return null;

  const lighter = Math.max(fgLuminance, bgLuminance);
  const darker = Math.min(fgLuminance, bgLuminance);
  return (lighter + 0.05) / (darker + 0.05);
};

const resolveSemanticToken = (name: string, condition: 'base' | 'dark') => {
  const token = semanticColors.find((value) => value.name === name);
  const reference = token?.values.find((value) => value.condition === condition)?.value ?? '';
  const match = /^\{colors\.(.*)\}$/.exec(reference);
  if (!match) return null;

  return colorTokens.find((value) => value.name === match[1])?.value ?? null;
};

export const Typography = () => (
  <ThemeProvider>
    <div className={shellClassName}>
      <div>
        <h2>Typography preview</h2>
        <p className={mutedClassName}>Quick reference of font sizes, weights, and line heights.</p>
      </div>

      <div className={cardClassName}>
        <div className={css({ display: 'grid', gap: '4' })}>
          {fontSizes.map((size) => (
            <div className={typographySampleClassName} key={size.name}>
              <div
                style={{
                  fontSize: size.value,
                  fontWeight: fontWeights.find((value) => value.name === 'medium')?.value ?? '500',
                  lineHeight: lineHeights.find((value) => value.name === 'normal')?.value ?? '1.5',
                }}
              >
                {size.name}: The quick brown fox jumps over the lazy dog
              </div>
              <div className={mutedClassName}>{size.value}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  </ThemeProvider>
);

export const ContrastChecker = () => {
  const defaultForeground = resolveSemanticToken('text.default', 'base') ?? '#171717';
  const defaultBackground = resolveSemanticToken('surface.default', 'base') ?? '#ffffff';

  const [foreground, setForeground] = useState(defaultForeground);
  const [background, setBackground] = useState(defaultBackground);

  const ratio = useMemo(() => contrastRatio(foreground, background), [background, foreground]);

  return (
    <ThemeProvider>
      <div className={shellClassName}>
        <div>
          <h2>Color contrast checker</h2>
          <p className={mutedClassName}>
            Contrast utility powered by token values from tokens.json and semantic-tokens.json.
          </p>
        </div>

        <div className={cardClassName}>
          <div className={controlsClassName}>
            <label>
              <div className={mutedClassName}>Foreground</div>
              <select
                className={selectClassName}
                onChange={(event) => setForeground(event.target.value)}
                value={foreground}
              >
                {colorTokens.map((token) => (
                  <option key={token.name} value={token.value}>
                    {token.name} ({token.value})
                  </option>
                ))}
              </select>
            </label>

            <label>
              <div className={mutedClassName}>Background</div>
              <select
                className={selectClassName}
                onChange={(event) => setBackground(event.target.value)}
                value={background}
              >
                {colorTokens.map((token) => (
                  <option key={token.name} value={token.value}>
                    {token.name} ({token.value})
                  </option>
                ))}
              </select>
            </label>
          </div>

          <div className={previewClassName} style={{ backgroundColor: background, color: foreground }}>
            <div
              style={{
                fontSize: '1.125rem',
                fontWeight: 600,
                lineHeight: 1.4,
              }}
            >
              Contrast ratio: {ratio ? ratio.toFixed(2) : 'N/A'}
            </div>
            <div style={{ marginTop: '0.5rem', lineHeight: 1.6 }}>
              Sample text for checking readability against the selected token pair.
            </div>
            <div className={css({ fontSize: 'sm', mt: '2' })}>
              AA normal text: {ratio && ratio >= 4.5 ? 'pass' : 'fail'}
            </div>
          </div>
        </div>
      </div>
    </ThemeProvider>
  );
};
