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
            muted: {
              value: { base: '{colors.neutral.100}', _dark: '{colors.neutral.800}' },
            },
            hover: {
              value: { base: '{colors.neutral.100}', _dark: '{colors.neutral.700}' },
            },
            canvas: {
              value: { base: '{colors.white}', _dark: '{colors.neutral.950}' },
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
            success: {
              value: { base: '{colors.green.600}', _dark: '{colors.green.300}' },
            },
            critical: {
              value: { base: '{colors.red.600}', _dark: '{colors.red.300}' },
            },
          },
          border: {
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
              value: { base: '{colors.white}', _dark: '{colors.neutral.950}' },
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
