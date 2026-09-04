import { defineRecipe } from '@pandacss/dev';

/**
 * Semantic button contract.
 *
 * IMPORTANT — single-variant-only design. Components in this package apply
 * recipe classes as STRINGS (they never call the recipe fn), and CSS coverage
 * comes from `staticCss: { recipes: { button: ['*'] } }`. `['*']` emits ONLY
 * single-variant classes — it does NOT emit `compoundVariants` CSS, and an
 * EMPTY variant value (`{}`) emits no class at all. So every combination must
 * resolve to a NON-EMPTY single variant that `Button.tsx` selects explicitly.
 * There are intentionally NO `compoundVariants` here.
 *
 * - Structural `variant` (`panel` | `item`) sets layout/role.
 * - `emphasis="solid"` carries the CTA / destructive fill via dark-aware
 *   `colorPalette.solid.*` role tokens directly in the variant value.
 * - Density differs by structural variant, so it is split into `itemDensity`
 *   (padding/type) and `panelDensity` (height/type); `Button.tsx` translates the
 *   public `density` prop to the right one based on `variant`.
 * - `size` sets panel/text height; `iconSize` carries ONLY the square width the
 *   component applies for icon-only panel buttons.
 */
export const buttonRecipe = defineRecipe({
  className: 'button',
  description:
    'Semantic button contract (single-variant-only for staticCss ["*"]). variant (panel|item) sets layout; emphasis="solid" + colorPalette produce CTA/destructive fills via dark-aware role tokens; itemDensity/panelDensity + size/iconSize set metrics.',
  base: {
    display: 'inline-flex',
    alignItems: 'center',
    gap: '1.5',
    borderRadius: 'md',
    borderWidth: 'hairline',
    borderStyle: 'solid',
    transitionDuration: 'fast',
    transitionProperty: 'background-color, color, border-color, box-shadow',
    _disabled: {
      opacity: '0.5',
      cursor: 'not-allowed',
    },
  },
  variants: {
    variant: {
      panel: {
        bg: 'surface.default',
        borderColor: 'border.subtle',
        color: 'text.default',
        textDecoration: 'none',
        cursor: 'pointer',
        textStyle: 'bodySm',
        lineHeight: '1.3',
        _hover: {
          borderColor: 'border.default',
        },
      },
      item: {
        display: 'flex',
        width: 'full',
        alignItems: 'baseline',
        textAlign: 'left',
        borderColor: 'transparent',
        bg: 'transparent',
        color: 'text.default',
        cursor: 'pointer',
        _hover: {
          bg: 'interactive.hover',
          borderColor: 'border.default',
        },
      },
    },
    // Box metrics AND type step. `size` now sets font-size too, so a default
    // button no longer inherits the larger body step. Item and compact-panel
    // buttons still get their type from `itemDensity`/`panelDensity`, which are
    // declared after `size` and win the cascade.
    size: {
      sm: {
        h: '6',
        px: '2',
        fontSize: 'xs',
      },
      md: {
        h: '8',
        px: '2.5',
        fontSize: 'sm',
      },
      lg: {
        h: '9',
        px: '3',
        fontSize: 'sm',
      },
    },
    // Item padding/type. Applied by the component only when variant==='item'.
    // Metrics kept byte-exact to the previous `density` variant.
    itemDensity: {
      comfortable: {
        px: '2',
        py: '1.5',
        fontSize: 'sm',
      },
      compact: {
        px: '2',
        py: '1',
        fontSize: 'xs',
      },
    },
    // Panel density. Applied by the component only when variant==='panel'
    // AND density==='compact' (comfortable panels are driven by `size`).
    panelDensity: {
      compact: {
        h: '7',
        px: '2',
        fontSize: 'xs',
        gap: '1',
      },
    },
    // CTA / destructive fill, straight in the variant value (no compound, no
    // variant gate — solid on an item button is fine/rare).
    emphasis: {
      solid: {
        bg: 'colorPalette.solid.bg',
        color: 'colorPalette.solid.fg',
        borderColor: 'colorPalette.solid.border',
        _hover: {
          bg: 'colorPalette.solid.bgHover',
          borderColor: 'colorPalette.solid.bgHover',
        },
        _active: {
          bg: 'colorPalette.solid.bgActive',
          borderColor: 'colorPalette.solid.bgActive',
        },
      },
    },
    colorPalette: {
      neutral: { colorPalette: 'neutral' },
      gray: { colorPalette: 'gray' },
      green: { colorPalette: 'green' },
      red: { colorPalette: 'red' },
      amber: { colorPalette: 'amber' },
      blue: { colorPalette: 'blue' },
    },
    selected: {
      true: {
        bg: 'interactive.selected',
      },
    },
    tone: {
      subdued: {
        color: 'text.muted',
      },
    },
    // Declared AFTER the density variants so its `px: 0` wins over
    // `panelDensity.compact`'s `px` for a compact icon-only button.
    iconOnly: {
      true: {
        justifyContent: 'center',
        gap: '0',
        px: '0',
      },
    },
    // Square width for icon-only panel buttons. Carries ONLY width; the
    // component emits it only when iconOnly && variant==='panel'.
    iconSize: {
      sm: {
        w: '6',
      },
      md: {
        w: '8',
      },
      lg: {
        w: '9',
      },
    },
  },
  defaultVariants: {
    variant: 'panel',
    size: 'md',
    colorPalette: 'neutral',
  },
});
