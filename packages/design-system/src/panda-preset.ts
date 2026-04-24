import { definePreset } from '@pandacss/dev';

import { interactiveItemRecipe } from './recipes/interactiveItem.recipe';
import { panelActionRecipe } from './recipes/panelAction.recipe';
import { panelSectionRecipe } from './recipes/panelSection.recipe';
import { segmentedControlRecipe } from './recipes/segmentedControl.recipe';
import { sectionHeadingRecipe } from './recipes/sectionHeading.recipe';
import { switchRecipe } from './recipes/switch.recipe';

export const designSystemPreset = definePreset({
  name: 'design-system',
  theme: {
    extend: {
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
      recipes: {
        panelAction: panelActionRecipe,
        interactiveItem: interactiveItemRecipe,
        sectionHeading: sectionHeadingRecipe,
        panelSection: panelSectionRecipe,
      },
      slotRecipes: {
        segmentedControl: segmentedControlRecipe,
        toggleSwitch: switchRecipe,
      },
    },
  },
});
