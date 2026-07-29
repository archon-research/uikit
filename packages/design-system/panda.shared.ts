import type { Config } from '@pandacss/dev';

import { badgeRecipe } from './src/recipes/badge.recipe';
import { buttonRecipe } from './src/recipes/button.recipe';
import { codeRecipe } from './src/recipes/code.recipe';
import { drawerRecipe } from './src/recipes/drawer.recipe';
import { emptyStateRecipe } from './src/recipes/emptyState.recipe';
import { indicatorRecipe } from './src/recipes/indicator.recipe';
import { inputRecipe } from './src/recipes/input.recipe';
import { interactiveItemRecipe } from './src/recipes/interactiveItem.recipe';
import { pageShellRecipe } from './src/recipes/pageShell.recipe';
import { panelActionRecipe } from './src/recipes/panelAction.recipe';
import { panelSectionRecipe } from './src/recipes/panelSection.recipe';
import { searchInputRecipe } from './src/recipes/searchInput.recipe';
import { sectionHeadingRecipe } from './src/recipes/sectionHeading.recipe';
import { segmentedControlRecipe } from './src/recipes/segmentedControl.recipe';
import { selectRecipe } from './src/recipes/select.recipe';
import { sidebarGridRecipe } from './src/recipes/sidebarGrid.recipe';
import { sidebarLayoutRecipe } from './src/recipes/sidebarLayout.recipe';
import { statRowRecipe, statTileRecipe } from './src/recipes/statTile.recipe';
import { surfaceMessageRecipe } from './src/recipes/surfaceMessage.recipe';
import { switchRecipe } from './src/recipes/switch.recipe';
import { themeToggleRecipe } from './src/recipes/themeToggle.recipe';

/**
 * Internal (unpublished) Panda config. Kept in shape-parity with the published
 * `src/panda-preset.ts`: same semantic token families, colorPalette role tokens,
 * keyframes/animations, and dark-aware shadows. The one thing that lives ONLY
 * here is `staticCss` — it is a Panda ROOT-config key and cannot be carried by a
 * preset (see the note on `staticCss` below).
 */

/**
 * Role-based colorPalette tokens on uikit's Tailwind-style
 * 50-950 scale. Each role exposes `bg` / `fg` / `border`, plus
 * `bgHover` / `bgActive` where interaction applies, with `base` and `_dark`
 * values so a role is structurally dark-aware. Selected via `colorPalette="green"`.
 */
const chromaticRoles = (hue: string, solidFg = '{colors.white}') => ({
  solid: {
    bg: { value: { base: `{colors.${hue}.600}`, _dark: `{colors.${hue}.500}` } },
    fg: { value: { base: solidFg, _dark: solidFg } },
    border: { value: { base: `{colors.${hue}.600}`, _dark: `{colors.${hue}.500}` } },
    bgHover: { value: { base: `{colors.${hue}.700}`, _dark: `{colors.${hue}.400}` } },
    bgActive: { value: { base: `{colors.${hue}.800}`, _dark: `{colors.${hue}.300}` } },
  },
  subtle: {
    bg: { value: { base: `{colors.${hue}.100}`, _dark: `{colors.${hue}.900}` } },
    fg: { value: { base: `{colors.${hue}.700}`, _dark: `{colors.${hue}.200}` } },
    border: { value: { base: `{colors.${hue}.200}`, _dark: `{colors.${hue}.800}` } },
    bgHover: { value: { base: `{colors.${hue}.200}`, _dark: `{colors.${hue}.800}` } },
    bgActive: { value: { base: `{colors.${hue}.300}`, _dark: `{colors.${hue}.700}` } },
  },
  surface: {
    bg: { value: { base: `{colors.${hue}.50}`, _dark: `{colors.${hue}.950}` } },
    fg: { value: { base: `{colors.${hue}.700}`, _dark: `{colors.${hue}.200}` } },
    border: { value: { base: `{colors.${hue}.200}`, _dark: `{colors.${hue}.800}` } },
  },
  outline: {
    bg: { value: { base: 'transparent', _dark: 'transparent' } },
    fg: { value: { base: `{colors.${hue}.700}`, _dark: `{colors.${hue}.300}` } },
    border: { value: { base: `{colors.${hue}.600}`, _dark: `{colors.${hue}.500}` } },
    bgHover: { value: { base: `{colors.${hue}.50}`, _dark: `{colors.${hue}.950}` } },
  },
  plain: {
    bg: { value: { base: 'transparent', _dark: 'transparent' } },
    fg: { value: { base: `{colors.${hue}.700}`, _dark: `{colors.${hue}.300}` } },
    border: { value: { base: 'transparent', _dark: 'transparent' } },
    bgHover: { value: { base: `{colors.${hue}.50}`, _dark: `{colors.${hue}.950}` } },
    bgActive: { value: { base: `{colors.${hue}.100}`, _dark: `{colors.${hue}.900}` } },
  },
});

const neutralRoles = {
  solid: {
    bg: { value: { base: '{colors.neutral.900}', _dark: '{colors.neutral.100}' } },
    fg: { value: { base: '{colors.white}', _dark: '{colors.neutral.900}' } },
    border: { value: { base: '{colors.neutral.900}', _dark: '{colors.neutral.100}' } },
    bgHover: { value: { base: '{colors.neutral.800}', _dark: '{colors.neutral.200}' } },
    bgActive: { value: { base: '{colors.neutral.700}', _dark: '{colors.neutral.300}' } },
  },
  subtle: {
    bg: { value: { base: '{colors.neutral.100}', _dark: '{colors.neutral.800}' } },
    fg: { value: { base: '{colors.neutral.700}', _dark: '{colors.neutral.200}' } },
    border: { value: { base: '{colors.neutral.200}', _dark: '{colors.neutral.700}' } },
    bgHover: { value: { base: '{colors.neutral.200}', _dark: '{colors.neutral.700}' } },
    bgActive: { value: { base: '{colors.neutral.300}', _dark: '{colors.neutral.600}' } },
  },
  surface: {
    bg: { value: { base: '{colors.neutral.50}', _dark: '{colors.neutral.900}' } },
    fg: { value: { base: '{colors.neutral.700}', _dark: '{colors.neutral.200}' } },
    border: { value: { base: '{colors.neutral.200}', _dark: '{colors.neutral.700}' } },
  },
  outline: {
    bg: { value: { base: 'transparent', _dark: 'transparent' } },
    fg: { value: { base: '{colors.neutral.700}', _dark: '{colors.neutral.200}' } },
    border: { value: { base: '{colors.neutral.400}', _dark: '{colors.neutral.600}' } },
    bgHover: { value: { base: '{colors.neutral.100}', _dark: '{colors.neutral.800}' } },
  },
  plain: {
    bg: { value: { base: 'transparent', _dark: 'transparent' } },
    fg: { value: { base: '{colors.neutral.700}', _dark: '{colors.neutral.200}' } },
    border: { value: { base: 'transparent', _dark: 'transparent' } },
    bgHover: { value: { base: '{colors.neutral.100}', _dark: '{colors.neutral.800}' } },
    bgActive: { value: { base: '{colors.neutral.200}', _dark: '{colors.neutral.700}' } },
  },
};

const colorPaletteRoles = {
  neutral: neutralRoles,
  gray: neutralRoles,
  green: chromaticRoles('green'),
  red: chromaticRoles('red'),
  amber: chromaticRoles('amber', '{colors.neutral.900}'),
  blue: chromaticRoles('blue'),
};

const keyframes = {
  indicatorPulse: {
    '0%, 100%': { opacity: '1', transform: 'scale(1)' },
    '50%': { opacity: '0.55', transform: 'scale(0.9)' },
  },
  feedRowFlash: {
    '0%': { backgroundColor: 'var(--colors-interactive-selected)' },
    '100%': { backgroundColor: 'transparent' },
  },
  valueSettleIn: {
    '0%': { opacity: '0', transform: 'translateY(-0.25rem)' },
    '100%': { opacity: '1', transform: 'translateY(0)' },
  },
  edgeRun: {
    '0%': { strokeDashoffset: '16' },
    '100%': { strokeDashoffset: '0' },
  },
  drawerSlide: {
    '0%': { transform: 'translateX(100%)' },
    '100%': { transform: 'translateX(0)' },
  },
};

const animationTokens = {
  indicatorPulse: {
    value: 'indicatorPulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
  },
  feedRowFlash: { value: 'feedRowFlash 1.2s ease-out' },
  valueSettleIn: { value: 'valueSettleIn 200ms ease-out' },
  edgeRun: { value: 'edgeRun 1s linear infinite' },
  drawerSlide: {
    value: 'drawerSlide 220ms cubic-bezier(0.32, 0.72, 0, 1)',
  },
};

/**
 * Dark-aware elevation shadows: the `_dark` variants pair a stronger drop shadow
 * with an inset top highlight so a raised panel reads as raised on a near-black
 * background (a single black rgba shadow is invisible there).
 */
const shadows = {
  elevation: {
    value: {
      base: '0 1px 2px 0 rgba(15, 23, 42, 0.08), 0 1px 3px 0 rgba(15, 23, 42, 0.06)',
      _dark: '0 1px 2px 0 rgba(0, 0, 0, 0.55), inset 0 1px 0 0 rgba(255, 255, 255, 0.06)',
    },
  },
  xs: {
    value: {
      base: '0 1px 2px 0 rgba(15, 23, 42, 0.06)',
      _dark: '0 1px 2px 0 rgba(0, 0, 0, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
    },
  },
  sm: {
    value: {
      base: '0 1px 3px 0 rgba(15, 23, 42, 0.10), 0 1px 2px -1px rgba(15, 23, 42, 0.10)',
      _dark: '0 2px 4px 0 rgba(0, 0, 0, 0.6), inset 0 1px 0 0 rgba(255, 255, 255, 0.06)',
    },
  },
};

export const designSystemPandaConfig = {
  jsxFramework: 'react',
  outExtension: 'js',
  preflight: true,
  // `staticCss` is a Panda ROOT-config key — a preset cannot carry it. Recipe
  // variants driven by RUNTIME state (e.g. `interactiveItem({ selected })`) emit
  // NO CSS unless the recipe is listed here, and the omission fails SILENTLY
  // (selection rendered nothing). List EVERY exported recipe/slot-recipe with
  // ['*'] so all variants are generated. Consumers of the published preset must
  // replicate this `staticCss.recipes` block in their own `panda.config`.
  staticCss: {
    recipes: {
      button: ['*'],
      interactiveItem: ['*'],
      panelSection: ['*'],
      sectionHeading: ['*'],
      panelAction: ['*'],
      segmentedControl: ['*'],
      surfaceMessage: ['*'],
      toggleSwitch: ['*'],
      input: ['*'],
      drawer: ['*'],
      statTile: ['*'],
      statRow: ['*'],
      code: ['*'],
      pageShell: ['*'],
      sidebarGrid: ['*'],
      badge: ['*'],
      indicator: ['*'],
      select: ['*'],
      searchInput: ['*'],
      emptyState: ['*'],
      themeToggle: ['*'],
      sidebarLayout: ['*'],
    },
  },
  studio: {
    logo: 'UI',
  },
  theme: {
    extend: {
      keyframes,
      tokens: {
        animations: animationTokens,
        // Real small end for the type scale (see panda-preset.ts). NOTE:
        // redefining `2xs` off Panda's 8px default is a BREAKING value-change.
        fontSizes: {
          '3xs': { value: '0.625rem' }, // 10px
          '2xs': { value: '0.6875rem' }, // 11px (was Panda default 8px)
        },
      },
      // This shared config (consumed by uikit-preview) previously defined NO
      // textStyles, so every recipe `textStyle: '…'` reference silently emitted
      // nothing here. Mirror the preset's textStyles so recipes render fully.
      textStyles: {
        sectionLabel: {
          value: { fontSize: 'xs', fontWeight: 'medium', letterSpacing: 'wide' },
        },
        panelTitle: {
          value: { fontSize: 'xl', fontWeight: 'semibold', lineHeight: 'tight' },
        },
        bodySm: {
          value: { fontSize: 'sm', lineHeight: 'relaxed' },
        },
        codeBlock: {
          value: { fontFamily: 'mono', fontSize: 'sm', lineHeight: 'relaxed' },
        },
        microLabel: {
          value: { fontSize: '3xs', fontWeight: 'medium', letterSpacing: 'wide' },
        },
        metaText: {
          value: { fontSize: '2xs', lineHeight: 'relaxed' },
        },
      },
      recipes: {
        button: buttonRecipe,
        panelAction: panelActionRecipe,
        interactiveItem: interactiveItemRecipe,
        sectionHeading: sectionHeadingRecipe,
        panelSection: panelSectionRecipe,
        statRow: statRowRecipe,
        code: codeRecipe,
        pageShell: pageShellRecipe,
        badge: badgeRecipe,
      },
      semanticTokens: {
        shadows,
        colors: {
          // ── Elevation ramp (theme-stable): canvas -> default -> subtle ──
          surface: {
            canvas: {
              value: { base: '{colors.neutral.50}', _dark: '{colors.neutral.950}' },
            },
            default: {
              value: { base: '{colors.white}', _dark: '{colors.neutral.900}' },
            },
            subtle: {
              value: { base: '{colors.neutral.100}', _dark: '{colors.neutral.800}' },
            },
            muted: {
              value: { base: '{colors.neutral.100}', _dark: '{colors.neutral.800}' },
            },
            hover: {
              value: { base: '{colors.neutral.100}', _dark: '{colors.neutral.700}' },
            },
          },
          text: {
            default: {
              value: { base: '{colors.neutral.900}', _dark: '{colors.neutral.100}' },
            },
            strong: {
              value: { base: '{colors.neutral.950}', _dark: '{colors.white}' },
            },
            muted: {
              value: { base: '{colors.neutral.500}', _dark: '{colors.neutral.400}' },
            },
            interactive: {
              value: { base: '{colors.blue.600}', _dark: '{colors.blue.300}' },
            },
            link: {
              value: { base: '{colors.blue.600}', _dark: '{colors.blue.300}' },
            },
            success: {
              value: { base: '{colors.green.600}', _dark: '{colors.green.300}' },
            },
            critical: {
              value: { base: '{colors.red.600}', _dark: '{colors.red.300}' },
            },
            warning: {
              value: { base: '{colors.amber.600}', _dark: '{colors.amber.300}' },
            },
          },
          border: {
            hairline: {
              value: {
                base: 'rgba(9, 9, 11, 0.06)',
                _dark: 'rgba(255, 255, 255, 0.08)',
              },
            },
            subtle: {
              value: { base: '{colors.neutral.300}', _dark: '{colors.neutral.700}' },
            },
            default: {
              value: { base: '{colors.neutral.400}', _dark: '{colors.neutral.600}' },
            },
            strong: {
              value: { base: '{colors.neutral.500}', _dark: '{colors.neutral.500}' },
            },
          },
          interactive: {
            hover: {
              value: { base: '{colors.blue.50}', _dark: '{colors.blue.950}' },
            },
            selected: {
              value: { base: '{colors.blue.100}', _dark: '{colors.blue.900}' },
            },
          },
          fg: {
            default: {
              value: { base: '{colors.neutral.900}', _dark: '{colors.neutral.100}' },
            },
          },
          bg: {
            canvas: {
              value: { base: '{colors.neutral.50}', _dark: '{colors.neutral.950}' },
            },
            success: {
              value: { base: '{colors.green.50}', _dark: '{colors.green.950}' },
            },
            critical: {
              value: { base: '{colors.red.50}', _dark: '{colors.red.950}' },
            },
            warning: {
              value: { base: '{colors.amber.50}', _dark: '{colors.amber.950}' },
            },
          },
          chart: {
            axis: {
              value: { base: '{colors.neutral.500}', _dark: '{colors.neutral.400}' },
            },
            grid: {
              value: { base: '{colors.neutral.200}', _dark: '{colors.neutral.700}' },
            },
            area: {
              primary: {
                value: { base: '{colors.blue.100}', _dark: '{colors.blue.900}' },
              },
            },
            series: {
              primary: {
                value: { base: '{colors.blue.600}', _dark: '{colors.blue.300}' },
              },
              secondary: {
                value: { base: '{colors.teal.600}', _dark: '{colors.teal.300}' },
              },
              tertiary: {
                value: { base: '{colors.violet.600}', _dark: '{colors.violet.300}' },
              },
              positive: {
                value: { base: '{colors.green.600}', _dark: '{colors.green.300}' },
              },
              critical: {
                value: { base: '{colors.red.600}', _dark: '{colors.red.300}' },
              },
            },
          },
          // ── colorPalette ROLE tokens (role-based, on the 50-950 scale) ──
          ...colorPaletteRoles,
        },
      },
      slotRecipes: {
        segmentedControl: segmentedControlRecipe,
        surfaceMessage: surfaceMessageRecipe,
        toggleSwitch: switchRecipe,
        input: inputRecipe,
        drawer: drawerRecipe,
        statTile: statTileRecipe,
        sidebarGrid: sidebarGridRecipe,
        indicator: indicatorRecipe,
        select: selectRecipe,
        searchInput: searchInputRecipe,
        emptyState: emptyStateRecipe,
        themeToggle: themeToggleRecipe,
        sidebarLayout: sidebarLayoutRecipe,
      },
    },
  },
} satisfies Partial<Config>;
