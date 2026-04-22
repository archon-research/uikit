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
      slotRecipes: {
        toggleSwitch: switchRecipe,
      },
    },
  },
} satisfies Partial<Config>;
