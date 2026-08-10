import { definePreset } from '@pandacss/dev';

import { badgeRecipe } from './recipes/badge.recipe.js';
import { buttonRecipe } from './recipes/button.recipe.js';
import { chipRecipe } from './recipes/chip.recipe.js';
import { codeRecipe } from './recipes/code.recipe.js';
import { dataTableRecipe } from './recipes/dataTable.recipe.js';
import { drawerRecipe } from './recipes/drawer.recipe.js';
import { emptyStateRecipe } from './recipes/emptyState.recipe.js';
import { facetedMultiSelectRecipe } from './recipes/facetedMultiSelect.recipe.js';
import { figureRecipe } from './recipes/figure.recipe.js';
import { flashRecipe } from './recipes/flash.recipe.js';
import { heatCellRecipe } from './recipes/heatCell.recipe.js';
import { indicatorRecipe } from './recipes/indicator.recipe.js';
import { inputRecipe } from './recipes/input.recipe.js';
import { interactiveItemRecipe } from './recipes/interactiveItem.recipe.js';
import { meterRecipe, proportionBarRecipe } from './recipes/meter.recipe.js';
import { pageShellRecipe } from './recipes/pageShell.recipe.js';
import { panelRecipe } from './recipes/panel.recipe.js';
import { panelActionRecipe } from './recipes/panelAction.recipe.js';
import { panelSectionRecipe } from './recipes/panelSection.recipe.js';
import { playbackBarRecipe } from './recipes/playbackBar.recipe.js';
import { rangeSliderRecipe } from './recipes/rangeSlider.recipe.js';
import { searchInputRecipe } from './recipes/searchInput.recipe.js';
import { sectionHeadingRecipe } from './recipes/sectionHeading.recipe.js';
import { segmentedControlRecipe } from './recipes/segmentedControl.recipe.js';
import { selectRecipe } from './recipes/select.recipe.js';
import { sidebarGridRecipe } from './recipes/sidebarGrid.recipe.js';
import { sidebarLayoutRecipe } from './recipes/sidebarLayout.recipe.js';
import { splitLayoutRecipe } from './recipes/splitLayout.recipe.js';
import { statRowRecipe, statTileRecipe } from './recipes/statTile.recipe.js';
import { surfaceMessageRecipe } from './recipes/surfaceMessage.recipe.js';
import { switchRecipe } from './recipes/switch.recipe.js';
import { themeToggleRecipe } from './recipes/themeToggle.recipe.js';
import { infoTipRecipe, tooltipRecipe } from './recipes/tooltip.recipe.js';

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
  dataTableFlashPositive: {
    '0%': { backgroundColor: 'var(--colors-bg-success)' },
    '100%': { backgroundColor: 'transparent' },
  },
  dataTableFlashCritical: {
    '0%': { backgroundColor: 'var(--colors-bg-critical)' },
    '100%': { backgroundColor: 'transparent' },
  },
  // Two-phase flash (`DataTable`'s `flashOnUpdate="two-phase"`): hold the
  // tint at full strength, then an independently-timed fade — as two
  // separate keyframes rather than `dataTableFlashPositive`'s single
  // ease-out, so the hold and fade durations can differ (see the
  // `dataTableFlashTwoPhase` animation token below). Named generically
  // (not `dataTable*`) because the hold/fade shape — tint via a CSS custom
  // property, hold, then fade to transparent — isn't specific to tables.
  flashHold: {
    '0%, 100%': { backgroundColor: 'var(--data-table-flash-color)' },
  },
  flashFade: {
    from: { backgroundColor: 'var(--data-table-flash-color)' },
    to: { backgroundColor: 'transparent' },
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
  dataTableFlashPositive: { value: 'dataTableFlashPositive 1s ease-out' },
  dataTableFlashCritical: { value: 'dataTableFlashCritical 1s ease-out' },
  // Report spec: hold ~300-500ms, then an independently-timed fade
  // ~800-1000ms. The CSS `animation` shorthand takes comma-separated
  // definitions, so both phases (and the fade's own delay, offset past the
  // end of the hold) live in this one token — `DataTable` just sets
  // `--data-table-flash-color` per direction (see the `dataTable` recipe's
  // `flashTwoPhase` variant) and applies this animation unchanged.
  dataTableFlashTwoPhase: {
    value: 'flashHold 400ms linear both, flashFade 900ms ease-out 400ms both',
  },
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
  // Floating-overlay elevation (modals, popovers, date pickers) — a step above
  // the resting `elevation` token.
  overlay: {
    value: {
      base: '0 12px 32px -8px rgba(9, 9, 11, 0.25), 0 4px 12px -4px rgba(9, 9, 11, 0.12)',
      _dark:
        '0 16px 40px -8px rgba(0, 0, 0, 0.6), inset 0 1px 0 0 rgba(255, 255, 255, 0.06)',
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
        // Layering scale for stacked surfaces (dropdowns, drawers, modals,
        // popovers, toasts, tooltips) so consumers stop hand-picking z-indexes.
        zIndex: {
          hide: { value: -1 },
          base: { value: 0 },
          docked: { value: 10 },
          dropdown: { value: 1000 },
          sticky: { value: 1100 },
          banner: { value: 1200 },
          overlay: { value: 1300 },
          modal: { value: 1400 },
          popover: { value: 1500 },
          skipNav: { value: 1600 },
          toast: { value: 1700 },
          tooltip: { value: 1800 },
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
            // Body text sits a step below `strong` so the two are actually
            // distinguishable — at neutral.900/neutral.100 `default` was within
            // ~1.1:1 of `strong` and the hierarchy collapsed. neutral.700 / dark
            // neutral.300 keep AA (≈10.4:1 / ≈12:1) while opening the gap.
            default: {
              value: {
                base: '{colors.neutral.700}',
                _dark: '{colors.neutral.300}',
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
            // Theme-invariant light text for always-dark fills (e.g. tooltips);
            // pair with `overlay.tooltip`.
            inverse: {
              value: {
                base: '{colors.neutral.50}',
                _dark: '{colors.neutral.50}',
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
            // A theme-invariant FILL for primary actions (e.g. the recovery
            // button in ErrorState/ErrorBoundary, RangePicker's apply) — white
            // label text on it is AA (5.17:1) in both themes. It is NOT a text
            // color: as foreground on the dark surface it is ~3.47:1 and fails
            // AA. For accent *text*, use `text.link` (dark-aware, 9.94:1 on the
            // dark surface). Components read `var(--colors-interactive-accent, …)`
            // from inline styles, so this token must stay defined.
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
          // Scrims and always-dark floating fills that can't be a surface step.
          overlay: {
            // Modal/drawer backdrop scrim.
            backdrop: {
              value: {
                base: 'rgba(9, 9, 11, 0.55)',
                _dark: 'rgba(0, 0, 0, 0.65)',
              },
            },
            // Always-dark tooltip fill (theme-invariant); use with text.inverse.
            tooltip: {
              value: {
                base: '{colors.neutral.800}',
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
              quaternary: {
                value: {
                  base: '{colors.amber.600}',
                  _dark: '{colors.amber.300}',
                },
              },
              quinary: {
                value: {
                  base: '{colors.pink.600}',
                  _dark: '{colors.pink.300}',
                },
              },
            },
          },
          /**
           * Diverging heat scale — green ↔ grey ↔ red, saturation =
           * magnitude, grey = flat. A SEPARATE token family from
           * `chart.series.*` (never a third hue for neutral, and never
           * repurposed from the categorical ramp's slots — a
           * deliberate constraint of this family, not a third hue). Seven fixed steps (`neg3…flat…pos3`)
           * rather than a continuous gradient: bucketing reads more
           * reliably than interpolation at tile size, and keeps the whole
           * scale expressible as tokens instead of runtime color math.
           * `fgStrong`/`fgSubtle` are the label colors for a saturated vs.
           * low-saturation/flat cell, respectively.
           */
          heat: {
            pos3: {
              value: {
                base: '{colors.green.600}',
                _dark: '{colors.green.500}',
              },
            },
            pos2: {
              value: {
                base: '{colors.green.400}',
                _dark: '{colors.green.700}',
              },
            },
            pos1: {
              value: {
                base: '{colors.green.200}',
                _dark: '{colors.green.900}',
              },
            },
            flat: {
              value: {
                base: '{colors.neutral.200}',
                _dark: '{colors.neutral.700}',
              },
            },
            neg1: {
              value: { base: '{colors.red.200}', _dark: '{colors.red.900}' },
            },
            neg2: {
              value: { base: '{colors.red.400}', _dark: '{colors.red.700}' },
            },
            neg3: {
              value: { base: '{colors.red.600}', _dark: '{colors.red.500}' },
            },
            fgStrong: {
              value: { base: '{colors.white}', _dark: '{colors.neutral.950}' },
            },
            fgSubtle: {
              value: {
                base: '{colors.neutral.900}',
                _dark: '{colors.neutral.100}',
              },
            },
          },
          // Categorical (status-free) encoding: 5 visually distinct hues for
          // grouping, category chips, and legends — NOT status (no red=alarm /
          // green=ok baggage). `bg` is a subtle fill, `fg` is AA-legible label
          // text on that fill, both dark-aware. Hue order matches chart.series so
          // a chip and its series line read as the same category.
          categorical: {
            '1': {
              bg: {
                value: { base: '{colors.blue.50}', _dark: '{colors.blue.950}' },
              },
              fg: {
                value: {
                  base: '{colors.blue.700}',
                  _dark: '{colors.blue.300}',
                },
              },
            },
            '2': {
              bg: {
                value: { base: '{colors.teal.50}', _dark: '{colors.teal.950}' },
              },
              fg: {
                value: {
                  base: '{colors.teal.700}',
                  _dark: '{colors.teal.300}',
                },
              },
            },
            '3': {
              bg: {
                value: {
                  base: '{colors.violet.50}',
                  _dark: '{colors.violet.950}',
                },
              },
              fg: {
                value: {
                  base: '{colors.violet.700}',
                  _dark: '{colors.violet.300}',
                },
              },
            },
            '4': {
              bg: {
                value: {
                  base: '{colors.amber.50}',
                  _dark: '{colors.amber.950}',
                },
              },
              fg: {
                value: {
                  base: '{colors.amber.800}',
                  _dark: '{colors.amber.300}',
                },
              },
            },
            '5': {
              bg: {
                value: { base: '{colors.pink.50}', _dark: '{colors.pink.950}' },
              },
              fg: {
                value: {
                  base: '{colors.pink.700}',
                  _dark: '{colors.pink.300}',
                },
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
        // Numeric/figure type: mono family with tabular figures and slightly
        // tightened tracking so columns of numbers align and a headline figure
        // and the row beneath it read as the same kind of value. Consumers reach
        // for this (or the `Figure` atom / `figure` recipe) instead of
        // re-declaring `fontVariantNumeric: 'tabular-nums'` at each call site.
        figure: {
          value: {
            fontFamily: 'mono',
            fontVariantNumeric: 'tabular-nums',
            letterSpacing: '-0.02em',
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
        figure: figureRecipe,
        tooltip: tooltipRecipe,
        flash: flashRecipe,
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
        splitLayout: splitLayoutRecipe,
        panel: panelRecipe,
        dataTable: dataTableRecipe,
        chip: chipRecipe,
        facetedMultiSelect: facetedMultiSelectRecipe,
        rangeSlider: rangeSliderRecipe,
        playbackBar: playbackBarRecipe,
        heatCell: heatCellRecipe,
        meter: meterRecipe,
        proportionBar: proportionBarRecipe,
        infoTip: infoTipRecipe,
      },
    },
  },
});
