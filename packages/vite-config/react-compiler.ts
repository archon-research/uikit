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
   * Whether the default `styled-system` exclusion applies.
   *
   * Set it to `false` where that path segment does not mean what
   * {@link DEFAULT_EXCLUDE} assumes it means — a directory of that name
   * holding hand-written components rather than Panda's generated output.
   * Since `exclude` only ever adds, that is otherwise unfixable, and it fails
   * the way this package exists to prevent: the build type-checks, exits 0,
   * and quietly ships those components unoptimized.
   *
   * `node_modules` is not part of this and stays out of the pass either way.
   * It is also `@rolldown/plugin-babel`'s own default `exclude`, which that
   * plugin applies to this pass independently of the filter set here — so an
   * option to compile dependencies would not work even if one existed.
   *
   * @default true
   */
  excludeStyledSystem?: boolean;
  /**
   * Forwarded to the compiler itself. Leave it unset on React 19.2 and later:
   * the compiler then emits calls into `react/compiler-runtime`, which those
   * versions ship. Only an older React needs an explicit `target`.
   */
  compiler?: ReactCompilerBabelOptions;
};

/**
 * `node_modules` is also `@rolldown/plugin-babel`'s own default `exclude`.
 * Restating it keeps this preset's exclusion self-contained rather than
 * dependent on that default staying what it is, and it is the one pattern here
 * that no option removes: dependencies ship compiled, and the plugin's own
 * default would keep them out of the pass regardless.
 */
const NODE_MODULES_EXCLUDE = /[/\\]node_modules[/\\]/;

/**
 * Panda's generated output, which every design-system consumer has — style
 * objects, token maps and type declarations, with no components in them.
 *
 * Its `jsx` subtree is the exception and is carved back IN: under
 * `jsxFramework: 'react'`, which this repo's own shared Panda config sets,
 * Panda generates real `forwardRef` components there. Excluding those would
 * skip the compiler on genuine components, and `exclude` only ever adds, so
 * undoing it would mean reaching for `excludeStyledSystem` — which no Panda
 * consumer should have to discover. A default that is wrong under a supported
 * Panda setting is worse than a default that compiles twenty extra generated
 * files.
 *
 * This is the one pattern {@link ReactCompilerOptions.excludeStyledSystem}
 * drops, for a project where the segment names something other than Panda's
 * `outdir`.
 */
const STYLED_SYSTEM_EXCLUDE = /[/\\]styled-system[/\\](?!jsx[/\\])/;

/**
 * Trees excluded from the Babel pass by default.
 *
 * Babel is the one part of a Vite 8 pipeline that is not Oxc, so it is the one
 * part worth not running. Nothing upstream narrows it: the compiler preset
 * ships only a `code` filter, and that filter is
 * `/forwardRef|memo|\b(?:[A-Z]|use[A-Z0-9])/` — near enough every module with a
 * capital letter in it, generated output very much included.
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
  NODE_MODULES_EXCLUDE,
  STYLED_SYSTEM_EXCLUDE,
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

  const defaults =
    options.excludeStyledSystem === false
      ? [NODE_MODULES_EXCLUDE]
      : DEFAULT_EXCLUDE;

  // The preset ships a `code` filter and no `id` filter, so without this every
  // module that survives the code test is handed to Babel. Spread rather than
  // replace: dropping the preset's own filters would widen the pass, not
  // narrow it.
  preset.rolldown.filter = {
    ...preset.rolldown.filter,
    id: { exclude: [...defaults, ...(options.exclude ?? [])] },
  };

  return babel({ presets: [preset] });
}
