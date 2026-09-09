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
   *
   * Prefer a `RegExp` over a glob string, for the reason
   * {@link DEFAULT_EXCLUDE} gives: a glob is dot-blind in one of the two
   * matchers that compile it.
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
 * part worth not running. Nothing upstream narrows it: the compiler preset
 * ships only a `code` filter, and that filter is
 * `/forwardRef|memo|\b(?:[A-Z]|use[A-Z0-9])/` — near enough every module with a
 * capital letter in it, generated output very much included.
 *
 * `node_modules` is also `@rolldown/plugin-babel`'s own default `exclude`.
 * Restating it keeps this preset's exclusion self-contained rather than
 * dependent on that default staying what it is.
 *
 * `styled-system` is Panda's generated output, which every design-system
 * consumer has — style objects, token maps and type declarations, with no
 * components in them. Its `jsx` subtree is the exception and is carved back
 * IN: under `jsxFramework: 'react'`, which this repo's own shared Panda config
 * sets, Panda generates real `forwardRef` components there. Excluding those
 * would skip the compiler on genuine components, and `exclude` below only ever
 * adds, so no consumer could undo it. A default that is wrong under a
 * supported Panda setting is worse than a default that compiles twenty extra
 * generated files.
 *
 * Written as regular expressions rather than glob strings on purpose. A string
 * pattern is compiled by two matchers that disagree: rolldown's own id filter,
 * where a leading-dot path segment matches, and `@rolldown/plugin-babel`'s
 * `picomatch(pattern)`, where it does not — picomatch defaults to
 * `dot: false`, so a project under `.cache/` or `.pnpm/` falls out of a
 * `styled-system` glob. Only rolldown's matcher is authoritative for the
 * wiring below, so a glob is not wrong here today; it is right by way of which
 * of the two gates happens to decide, which is a plugin internal. A `RegExp`
 * is `pattern.test(id)` on both sides and has no such blind spot.
 */
export const DEFAULT_EXCLUDE: readonly IdPattern[] = [
  /[/\\]node_modules[/\\]/,
  /[/\\]styled-system[/\\](?!jsx[/\\])/,
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
