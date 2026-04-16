import {
  interactiveItemRecipe,
  panelActionRecipe,
  panelSectionRecipe,
  relationTabsRecipe,
  sectionHeadingRecipe,
  switchRecipe,
  treeRowRecipe,
} from './recipes/index.js';

export const designSystemTheme = {
  semanticTokens: {
    colors: {
      surface: {
        default: {
          value: { base: '{colors.white}', _dark: '{colors.gray.950}' },
        },
        subtle: {
          value: { base: '{colors.gray.50}', _dark: '{colors.gray.900}' },
        },
      },
      border: {
        subtle: {
          value: { base: '{colors.gray.100}', _dark: '{colors.gray.800}' },
        },
        default: {
          value: { base: '{colors.gray.200}', _dark: '{colors.gray.700}' },
        },
      },
      text: {
        muted: {
          value: { base: '{colors.gray.600}', _dark: '{colors.gray.500}' },
        },
        default: {
          value: { base: '{colors.gray.700}', _dark: '{colors.gray.300}' },
        },
        strong: {
          value: { base: '{colors.gray.900}', _dark: '{colors.gray.100}' },
        },
      },
      interactive: {
        hover: {
          value: { base: '{colors.gray.200}', _dark: '{colors.gray.700}' },
        },
        selected: {
          value: { base: '{colors.gray.100}', _dark: '{colors.gray.800}' },
        },
      },
    },
  },
  textStyles: {
    sectionLabel: {
      value: {
        fontSize: 'xs',
        fontWeight: 'medium',
        letterSpacing: 'wide',
      },
    },
    panelTitle: {
      value: {
        fontSize: 'xl',
        fontWeight: 'semibold',
        lineHeight: 'tight',
      },
    },
    bodySm: {
      value: {
        fontSize: 'sm',
        lineHeight: 'relaxed',
      },
    },
    codeBlock: {
      value: {
        fontFamily: 'mono',
        fontSize: 'sm',
        lineHeight: 'relaxed',
      },
    },
  },
  layerStyles: {
    panelHeader: {
      value: {
        paddingInline: '1.25rem',
        paddingBlock: '1.25rem',
        borderBottom: '1px solid {colors.border.default}',
        background: '{colors.surface.default}',
      },
    },
    panelBody: {
      value: {
        paddingInline: '1.25rem',
        paddingBlock: '1.25rem',
        background: '{colors.surface.default}',
      },
    },
    panelFooter: {
      value: {
        paddingInline: '1.25rem',
        paddingBlock: '1rem',
        borderTop: '1px solid {colors.border.subtle}',
        background: '{colors.surface.default}',
      },
    },
  },
  recipes: {
    panelAction: panelActionRecipe,
    interactiveItem: interactiveItemRecipe,
    sectionHeading: sectionHeadingRecipe,
    panelSection: panelSectionRecipe,
  },
  slotRecipes: {
    relationTabs: relationTabsRecipe,
    toggleSwitch: switchRecipe,
    treeRow: treeRowRecipe,
  },
};

export function createPandaConfig(overrides = {}) {
  return {
    preflight: true,
    include: ['./src/**/*.{ts,tsx,js,jsx}'],
    exclude: [],
    gitignore: true,
    outdir: 'styled-system',
    jsxFramework: 'react',
    staticCss: {
      recipes: {
        interactiveItem: [
          { selected: ['true', 'false'], density: ['comfortable', 'compact'] },
        ],
        treeRow: [{ level: ['1', '2', '3', '4', '5'] }],
      },
    },
    utilities: {
      extend: {
        truncate: {
          className: 'truncate',
          values: { type: 'boolean' },
          transform(value) {
            if (!value) return {};
            return {
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            };
          },
        },
      },
    },
    theme: {
      extend: designSystemTheme,
    },
    ...overrides,
  };
}
