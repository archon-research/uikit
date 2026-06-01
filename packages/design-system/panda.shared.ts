import type { Config } from '@pandacss/dev';

import { buttonRecipe } from './src/recipes/button.recipe';
import { segmentedControlRecipe } from './src/recipes/segmentedControl.recipe';
import { surfaceMessageRecipe } from './src/recipes/surfaceMessage.recipe';
import { switchRecipe } from './src/recipes/switch.recipe';

export const designSystemPandaConfig = {
  jsxFramework: 'react',
  outExtension: 'js',
  preflight: true,
  staticCss: {
    recipes: {
      button: ['*'],
      toggleSwitch: ['*'],
    },
  },
  studio: {
    logo: 'UI',
  },
  theme: {
    extend: {
      recipes: {
        button: buttonRecipe,
      },
      semanticTokens: {
        colors: {
          surface: {
            default: {
              value: { base: '{colors.white}', _dark: '{colors.neutral.900}' },
            },
            subtle: {
              value: { base: '{colors.neutral.50}', _dark: '{colors.neutral.800}' },
            },
          },
          text: {
            default: {
              value: { base: '{colors.neutral.900}', _dark: '{colors.neutral.100}' },
            },
            muted: {
              value: { base: '{colors.neutral.500}', _dark: '{colors.neutral.400}' },
            },
          },
          border: {
            subtle: {
              value: { base: '{colors.neutral.300}', _dark: '{colors.neutral.700}' },
            },
          },
        },
      },
      slotRecipes: {
        segmentedControl: segmentedControlRecipe,
        surfaceMessage: surfaceMessageRecipe,
        toggleSwitch: switchRecipe,
      },
    },
  },
} satisfies Partial<Config>;
