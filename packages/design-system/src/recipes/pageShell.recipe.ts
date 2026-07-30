import { defineRecipe } from '@pandacss/dev';

/**
 * Centered page content column. The default ~1160px cap ships as a static
 * class; a caller-supplied maxWidth is passed as the `--page-max-width` custom
 * property (a runtime value Panda cannot statically extract) which the recipe
 * reads with a token fallback.
 */
export const pageShellRecipe = defineRecipe({
  className: 'pageShell',
  description:
    'Centered page content column with a token max-width, overridable at runtime via the --page-max-width custom property.',
  base: {
    width: '100%',
    maxWidth: 'var(--page-max-width, 72.5rem)',
    marginInline: 'auto',
    paddingInline: {
      base: '4',
      md: '6',
    },
  },
});
