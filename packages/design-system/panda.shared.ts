import { switchRecipe } from './src/recipes/switch.recipe';
import type { Config } from '@pandacss/dev';

export const designSystemPandaConfig = {
  jsxFramework: 'react',
  outExtension: 'js',
  preflight: true,
  staticCss: {
    recipes: {
      toggleSwitch: ['*'],
    },
  },
  studio: {
    logo: 'UI',
    title: 'UIKit Design System',
  },
  theme: {
    extend: {
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
        toggleSwitch: switchRecipe,
      },
    },
  },
} satisfies Partial<Config>;
