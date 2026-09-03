import babel from '@rolldown/plugin-babel';
import { reactCompilerPreset } from '@vitejs/plugin-react';
import type { PluginOption } from 'vite';

/**
 * Vite 8 bundles with rolldown, and rolldown's own transformer is Oxc, which
 * does not run Babel plugins. So the React Compiler is not a `@vitejs/plugin-react`
 * option: it is a separate Babel pass, added as a rolldown preset alongside
 * `react()`. That indirection is the whole reason this preset exists — it is
 * identical in every app, and easy to wire up in a way that silently compiles
 * nothing.
 */

/** The React Compiler's Babel options, as `@vitejs/plugin-react` accepts them. */
export type ReactCompilerBabelOptions = NonNullable<
  Parameters<typeof reactCompilerPreset>[0]
>;

/** A rolldown id filter pattern: a picomatch glob or a regular expression. */
export type IdPattern = string | RegExp;

export type ReactCompilerOptions = {
  /**
   * Extra module ids kept away from the Babel pass, merged after
   * {@link DEFAULT_EXCLUDE} rather than replacing it. Generated trees are the
   * usual candidates — anything with no components in it is pure cost.
   */
  exclude?: readonly IdPattern[];
  /**
   * Forwarded to the compiler itself. Leave it unset on React 19.2 and later:
   * the compiler then emits calls into `react/compiler-runtime`, which those
   * versions ship. Only an older React needs an explicit `target`.
   */
  compiler?: ReactCompilerBabelOptions;
};

/**
 * Trees excluded from the Babel pass by default.
 *
 * Babel is the one part of a Vite 8 pipeline that is not Oxc, so it is the one
 * part worth not running. `styled-system` is Panda's generated output, which
 * every design-system consumer has and which holds no components at all.
 * `node_modules` is already outside `@rolldown/plugin-babel`'s own default
 * `exclude`, but the rolldown id filter is a cheaper pre-test that runs first.
 */
export const DEFAULT_EXCLUDE: readonly IdPattern[] = [
  '**/node_modules/**',
  '**/styled-system/**',
];

/**
 * The React Compiler, wired for Vite 8.
 *
 * Add it after `@vitejs/plugin-react`, which stays responsible for JSX and Fast
 * Refresh:
 *
 * ```ts
 * import react from '@vitejs/plugin-react';
 * import reactCompiler from '@archon-research/vite-config/react-compiler';
 *
 * export default defineConfig({
 *   plugins: [react(), reactCompiler()],
 * });
 * ```
 *
 * Returns a promise, which Vite accepts directly in `plugins`.
 */
export default function reactCompiler(
  options: ReactCompilerOptions = {},
): PluginOption {
  const preset = reactCompilerPreset(options.compiler);

  // The preset ships a `code` filter and no `id` filter, so without this every
  // module that survives the code test is handed to Babel. Spread rather than
  // replace: dropping the preset's own filters would widen the pass, not
  // narrow it.
  preset.rolldown.filter = {
    ...preset.rolldown.filter,
    id: { exclude: [...DEFAULT_EXCLUDE, ...(options.exclude ?? [])] },
  };

  return babel({ presets: [preset] });
}
