import { definePreset } from '@pandacss/dev';

import { badgeRecipe } from './recipes/badge.recipe';
import { buttonRecipe } from './recipes/button.recipe';
import { codeRecipe } from './recipes/code.recipe';
import { dataTableRecipe } from './recipes/dataTable.recipe';
import { drawerRecipe } from './recipes/drawer.recipe';
import { emptyStateRecipe } from './recipes/emptyState.recipe';
import { indicatorRecipe } from './recipes/indicator.recipe';
import { inputRecipe } from './recipes/input.recipe';
import { interactiveItemRecipe } from './recipes/interactiveItem.recipe';
import { pageShellRecipe } from './recipes/pageShell.recipe';
import { panelRecipe } from './recipes/panel.recipe';
import { panelActionRecipe } from './recipes/panelAction.recipe';
import { panelSectionRecipe } from './recipes/panelSection.recipe';
import { searchInputRecipe } from './recipes/searchInput.recipe';
import { sectionHeadingRecipe } from './recipes/sectionHeading.recipe';
import { segmentedControlRecipe } from './recipes/segmentedControl.recipe';
import { selectRecipe } from './recipes/select.recipe';
import { sidebarGridRecipe } from './recipes/sidebarGrid.recipe';
import { sidebarLayoutRecipe } from './recipes/sidebarLayout.recipe';
import { statRowRecipe, statTileRecipe } from './recipes/statTile.recipe';
import { surfaceMessageRecipe } from './recipes/surfaceMessage.recipe';
import { switchRecipe } from './recipes/switch.recipe';
import { themeToggleRecipe } from './recipes/themeToggle.recipe';

/**
 * BREAKING VALUE-CHANGES (batch into the next major):
 * This preset is reconciled onto the shared config's `neutral.*` family so the
 * published tokens match what the components actually render. The following
 * EXISTING token values change (rendered output differs); everything else in
 * this file is purely additive.
 *
 *   - Base palette unified `gray.*` -> `neutral.*` across surface/text/border/
 *     interactive (previously the preset used `gray.*`).
 *   - `interactive.selected`: grey wash (`gray.100/gray.800`) ->
 *     blue-tinted state (`blue.100/blue.900`) so selection reads as active.
 *   - `surface.default` (raised panel) DARK value: `gray.950` (the DARKEST
 *     step, page-like) -> `neutral.900`. Previously elevation INVERTED in dark
 *     mode: the "raised" panel was the darkest value on the page. It is now
 *     lighter than the canvas in both themes.
 *   - `surface.canvas` / `bg.canvas` LIGHT value: `white` -> `neutral.50` so the
 *     page sits behind (recedes from) raised white panels — a real 3-step ramp.
 *   - `surface.subtle` (recessed inset): `gray.50/gray.900` ->
 *     `neutral.100/neutral.800`.
 *
 * ELEVATION RAMP (theme-stable): canvas (page) -> default (raised panel) ->
 * subtle (recessed inset). The raised panel is always distinct from and forward
 * of the page in BOTH themes; elevation no longer inverts between light/dark.
 *
 * NOTE: `staticCss` is a Panda ROOT-config key and cannot be carried by a preset.
 * Recipe variants driven by runtime state (e.g. `interactiveItem({ selected })`)
 * emit NO CSS unless the consuming `panda.config` lists them in `staticCss`.
 * `panda.shared.ts` sets this for the internal build; consumers of this preset
 * must replicate `staticCss.recipes` for every recipe they render dynamically.
 */

/**
 * Build role-based colorPalette tokens on uikit's Tailwind-style
 * 50-950 scale. Each role exposes `bg` / `fg` / `border`, plus
 * `bgHover` / `bgActive` where interaction applies, and carries both `base` and
 * `_dark` values so a role is structurally dark-aware. Consumers pick a color via
 * `colorPalette="green"` and recipes reference `colorPalette.solid.bg`,
 * `colorPalette.subtle.fg`, `colorPalette.outline.border`, etc. — never a literal.
 */
const chromaticRoles = (hue: string, solidFg = '{colors.white}') => ({
  solid: {
    bg: {
      value: { base: `{colors.${hue}.600}`, _dark: `{colors.${hue}.500}` },
    },
    fg: { value: { base: solidFg, _dark: solidFg } },
    border: {
      value: { base: `{colors.${hue}.600}`, _dark: `{colors.${hue}.500}` },
    },
    bgHover: {
      value: { base: `{colors.${hue}.700}`, _dark: `{colors.${hue}.400}` },
    },
    bgActive: {
      value: { base: `{colors.${hue}.800}`, _dark: `{colors.${hue}.300}` },
    },
  },
  subtle: {
    bg: {
      value: { base: `{colors.${hue}.100}`, _dark: `{colors.${hue}.900}` },
    },
    fg: {
      value: { base: `{colors.${hue}.700}`, _dark: `{colors.${hue}.200}` },
    },
    border: {
      value: { base: `{colors.${hue}.200}`, _dark: `{colors.${hue}.800}` },
    },
    bgHover: {
      value: { base: `{colors.${hue}.200}`, _dark: `{colors.${hue}.800}` },
    },
    bgActive: {
      value: { base: `{colors.${hue}.300}`, _dark: `{colors.${hue}.700}` },
    },
  },
  surface: {
    bg: { value: { base: `{colors.${hue}.50}`, _dark: `{colors.${hue}.950}` } },
    fg: {
      value: { base: `{colors.${hue}.700}`, _dark: `{colors.${hue}.200}` },
    },
    border: {
      value: { base: `{colors.${hue}.200}`, _dark: `{colors.${hue}.800}` },
    },
  },
  outline: {
    bg: { value: { base: 'transparent', _dark: 'transparent' } },
    fg: {
      value: { base: `{colors.${hue}.700}`, _dark: `{colors.${hue}.300}` },
    },
    border: {
      value: { base: `{colors.${hue}.600}`, _dark: `{colors.${hue}.500}` },
    },
    bgHover: {
      value: { base: `{colors.${hue}.50}`, _dark: `{colors.${hue}.950}` },
    },
  },
  plain: {
    bg: { value: { base: 'transparent', _dark: 'transparent' } },
    fg: {
      value: { base: `{colors.${hue}.700}`, _dark: `{colors.${hue}.300}` },
    },
    border: { value: { base: 'transparent', _dark: 'transparent' } },
    bgHover: {
      value: { base: `{colors.${hue}.50}`, _dark: `{colors.${hue}.950}` },
    },
    bgActive: {
      value: { base: `{colors.${hue}.100}`, _dark: `{colors.${hue}.900}` },
    },
  },
});

/**
 * Neutral roles are defined explicitly: a neutral `solid` inverts across themes
 * (dark surface + light text in light mode; light surface + dark text in dark
 * mode), which the chromatic helper does not model.
 */
const neutralRoles = {
  solid: {
    bg: {
      value: { base: '{colors.neutral.900}', _dark: '{colors.neutral.100}' },
    },
    fg: { value: { base: '{colors.white}', _dark: '{colors.neutral.900}' } },
    border: {
      value: { base: '{colors.neutral.900}', _dark: '{colors.neutral.100}' },
    },
    bgHover: {
      value: { base: '{colors.neutral.800}', _dark: '{colors.neutral.200}' },
    },
    bgActive: {
      value: { base: '{colors.neutral.700}', _dark: '{colors.neutral.300}' },
    },
  },
  subtle: {
    bg: {
      value: { base: '{colors.neutral.100}', _dark: '{colors.neutral.800}' },
    },
    fg: {
      value: { base: '{colors.neutral.700}', _dark: '{colors.neutral.200}' },
    },
    border: {
      value: { base: '{colors.neutral.200}', _dark: '{colors.neutral.700}' },
    },
    bgHover: {
      value: { base: '{colors.neutral.200}', _dark: '{colors.neutral.700}' },
    },
    bgActive: {
      value: { base: '{colors.neutral.300}', _dark: '{colors.neutral.600}' },
    },
  },
  surface: {
    bg: {
      value: { base: '{colors.neutral.50}', _dark: '{colors.neutral.900}' },
    },
    fg: {
      value: { base: '{colors.neutral.700}', _dark: '{colors.neutral.200}' },
    },
    border: {
      value: { base: '{colors.neutral.200}', _dark: '{colors.neutral.700}' },
    },
  },
  outline: {
    bg: { value: { base: 'transparent', _dark: 'transparent' } },
    fg: {
      value: { base: '{colors.neutral.700}', _dark: '{colors.neutral.200}' },
    },
    border: {
      value: { base: '{colors.neutral.400}', _dark: '{colors.neutral.600}' },
    },
    bgHover: {
      value: { base: '{colors.neutral.100}', _dark: '{colors.neutral.800}' },
    },
  },
  plain: {
    bg: { value: { base: 'transparent', _dark: 'transparent' } },
    fg: {
      value: { base: '{colors.neutral.700}', _dark: '{colors.neutral.200}' },
    },
    border: { value: { base: 'transparent', _dark: 'transparent' } },
    bgHover: {
      value: { base: '{colors.neutral.100}', _dark: '{colors.neutral.800}' },
    },
    bgActive: {
      value: { base: '{colors.neutral.200}', _dark: '{colors.neutral.700}' },
    },
  },
};

/**
 * colorPalette ROLE token map. `gray` is aliased to `neutral` for back-compat so
 * existing `colorPalette="gray"` consumers keep working after the gray->neutral
 * unification.
 */
const colorPaletteRoles = {
  neutral: neutralRoles,
  gray: neutralRoles,
  green: chromaticRoles('green'),
  red: chromaticRoles('red'),
  amber: chromaticRoles('amber', '{colors.neutral.900}'),
  blue: chromaticRoles('blue'),
};

/**
 * Keyframes for the app's motion vocabulary. Consumed via the `animations`
 * tokens below (e.g. `animation: 'token(animations.indicatorPulse)'`).
 */
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
 * Dark-aware elevation shadows. A single black rgba shadow is invisible on a
 * near-black dark panel, so the `_dark` variants pair a stronger drop shadow with
 * an inset top highlight to read as a raised edge. `elevation` is the default
 * raised-panel token; `xs`/`sm` override Panda's theme-blind defaults.
 */
const shadows = {
  elevation: {
    value: {
      base: '0 1px 2px 0 rgba(15, 23, 42, 0.08), 0 1px 3px 0 rgba(15, 23, 42, 0.06)',
      _dark:
        '0 1px 2px 0 rgba(0, 0, 0, 0.55), inset 0 1px 0 0 rgba(255, 255, 255, 0.06)',
    },
  },
  xs: {
    value: {
      base: '0 1px 2px 0 rgba(15, 23, 42, 0.06)',
      _dark:
        '0 1px 2px 0 rgba(0, 0, 0, 0.5), inset 0 1px 0 0 rgba(255, 255, 255, 0.05)',
    },
  },
  sm: {
    value: {
      base: '0 1px 3px 0 rgba(15, 23, 42, 0.10), 0 1px 2px -1px rgba(15, 23, 42, 0.10)',
      _dark:
        '0 2px 4px 0 rgba(0, 0, 0, 0.6), inset 0 1px 0 0 rgba(255, 255, 255, 0.06)',
    },
  },
};

export const designSystemPreset = definePreset({
  name: 'design-system',
  // Tell the UA which scheme is active so native surfaces (scrollbars, caret,
  // spellcheck, <select> popups) match the theme. The theme layer sets `.dark`
  // + `data-theme` on <html>; without `color-scheme` a dark page keeps
  // light-painted scrollbars. Preset globalCss merges into every consumer.
  globalCss: {
    ':root': { colorScheme: 'light' },
    '.dark, [data-theme="dark"]': { colorScheme: 'dark' },
  },
  theme: {
    extend: {
      keyframes,
      tokens: {
        animations: animationTokens,
        // Panda's default type scale has no small end — `2xs` is 0.5rem (8px),
        // then a jump to `xs` (12px), so a dense UI's ~9.5–12px micro band
        // collapses onto one stop. Add real steps below `xs`.
        // NOTE: redefining `2xs` off Panda's 8px is a BREAKING value-change,
        // batched with the major alongside the other value shifts above.
        fontSizes: {
          '3xs': { value: '0.625rem' }, // 10px — micro labels
          '2xs': { value: '0.6875rem' }, // 11px (was Panda default 8px)
        },
      },
      semanticTokens: {
        shadows,
        colors: {
          // ── Elevation ramp (theme-stable): canvas -> default -> subtle ──
          surface: {
            // page background (level 0) — recedes behind raised panels
            canvas: {
              value: {
                base: '{colors.neutral.50}',
                _dark: '{colors.neutral.950}',
              },
            },
            // raised panel (level 1) — forward of the page in BOTH themes
            default: {
              value: { base: '{colors.white}', _dark: '{colors.neutral.900}' },
            },
            // recessed inset within a panel (input well, code block)
            subtle: {
              value: {
                base: '{colors.neutral.100}',
                _dark: '{colors.neutral.800}',
              },
            },
            // muted fill (chips, disabled fills)
            muted: {
              value: {
                base: '{colors.neutral.100}',
                _dark: '{colors.neutral.800}',
              },
            },
            // hover wash on raised surfaces
            hover: {
              value: {
                base: '{colors.neutral.100}',
                _dark: '{colors.neutral.700}',
              },
            },
          },
          text: {
            default: {
              value: {
                base: '{colors.neutral.900}',
                _dark: '{colors.neutral.100}',
              },
            },
            strong: {
              value: { base: '{colors.neutral.950}', _dark: '{colors.white}' },
            },
            muted: {
              value: {
                base: '{colors.neutral.500}',
                _dark: '{colors.neutral.400}',
              },
            },
            interactive: {
              value: { base: '{colors.blue.600}', _dark: '{colors.blue.300}' },
            },
            link: {
              value: { base: '{colors.blue.600}', _dark: '{colors.blue.300}' },
            },
            success: {
              value: {
                base: '{colors.green.600}',
                _dark: '{colors.green.300}',
              },
            },
            critical: {
              value: { base: '{colors.red.600}', _dark: '{colors.red.300}' },
            },
            warning: {
              value: {
                base: '{colors.amber.600}',
                _dark: '{colors.amber.300}',
              },
            },
          },
          border: {
            hairline: {
              // ~6% alpha hairline for low-noise dividers/insets
              value: {
                base: 'rgba(9, 9, 11, 0.06)',
                _dark: 'rgba(255, 255, 255, 0.08)',
              },
            },
            subtle: {
              value: {
                base: '{colors.neutral.300}',
                _dark: '{colors.neutral.700}',
              },
            },
            default: {
              value: {
                base: '{colors.neutral.400}',
                _dark: '{colors.neutral.600}',
              },
            },
            strong: {
              value: {
                base: '{colors.neutral.500}',
                _dark: '{colors.neutral.500}',
              },
            },
          },
          interactive: {
            hover: {
              value: { base: '{colors.blue.50}', _dark: '{colors.blue.950}' },
            },
            selected: {
              // A subtle blue-tinted selection. The dark value is a low-mix tint,
              // not a saturated fill — `blue.900` read as an error block on dense
              // dark tables.
              value: {
                base: '{colors.blue.100}',
                _dark:
                  'color-mix(in srgb, {colors.blue.500} 24%, {colors.surface.default})',
              },
            },
            // Solid accent fill for primary actions (e.g. the recovery button in
            // ErrorState/ErrorBoundary, RangePicker's apply). Those components read
            // `var(--colors-interactive-accent, …)` from an inline style; without
            // this token they fell back to a hardcoded off-theme blue in both
            // themes. `blue.600` keeps white label text at AA either way.
            accent: {
              value: { base: '{colors.blue.600}', _dark: '{colors.blue.600}' },
            },
          },
          scrollbar: {
            thumb: {
              value: {
                base: '{colors.neutral.300}',
                _dark: '{colors.neutral.600}',
              },
            },
            track: {
              value: {
                base: '{colors.neutral.100}',
                _dark: '{colors.neutral.800}',
              },
            },
          },
          fg: {
            default: {
              value: {
                base: '{colors.neutral.900}',
                _dark: '{colors.neutral.100}',
              },
            },
          },
          bg: {
            canvas: {
              value: {
                base: '{colors.neutral.50}',
                _dark: '{colors.neutral.950}',
              },
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
              value: {
                base: '{colors.neutral.500}',
                _dark: '{colors.neutral.400}',
              },
            },
            grid: {
              value: {
                base: '{colors.neutral.200}',
                _dark: '{colors.neutral.700}',
              },
            },
            area: {
              primary: {
                value: {
                  base: '{colors.blue.100}',
                  _dark: '{colors.blue.900}',
                },
              },
            },
            series: {
              primary: {
                value: {
                  base: '{colors.blue.600}',
                  _dark: '{colors.blue.300}',
                },
              },
              secondary: {
                value: {
                  base: '{colors.teal.600}',
                  _dark: '{colors.teal.300}',
                },
              },
              tertiary: {
                value: {
                  base: '{colors.violet.600}',
                  _dark: '{colors.violet.300}',
                },
              },
              positive: {
                value: {
                  base: '{colors.green.600}',
                  _dark: '{colors.green.300}',
                },
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
      textStyles: {
        sectionLabel: {
          value: {
            fontSize: 'xs',
            fontWeight: 'medium',
            letterSpacing: 'wide',
          },
        },
        // Micro type roles so consumers stop reaching for a raw `2xs`/`3xs`.
        microLabel: {
          value: {
            fontSize: '3xs',
            fontWeight: 'medium',
            letterSpacing: 'wide',
          },
        },
        metaText: {
          value: {
            fontSize: '2xs',
            lineHeight: 'relaxed',
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
      slotRecipes: {
        surfaceMessage: surfaceMessageRecipe,
        segmentedControl: segmentedControlRecipe,
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
        panel: panelRecipe,
        dataTable: dataTableRecipe,
      },
    },
  },
});
