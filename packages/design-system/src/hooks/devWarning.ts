// Ambient, package-local declaration — this package's `tsconfig.json` has no
// `"types": ["node"]` reference, so `process` isn't otherwise a known global.
// Declaring it as possibly `undefined` keeps the `typeof process` guard below
// meaningful to the type checker without pulling in `@types/node`.
declare const process: { env?: { NODE_ENV?: string } } | undefined;

/**
 * `true` outside a production build; gates the dev-only `console.warn` calls
 * in this package (identity churn, missing `getRowId`). Computed once at
 * module scope rather than per-call.
 *
 * Bundlers statically replace `process.env.NODE_ENV`, so in a production
 * build this collapses to `false` (and the warning call is typically
 * dead-code-eliminated entirely); the `typeof process` guard keeps the check
 * safe to evaluate even where nothing defines a global `process` at all
 * (e.g. an unbundled ESM environment).
 */
export const IS_DEV_WARNING_ENABLED =
  typeof process !== 'undefined' && process?.env?.NODE_ENV !== 'production';
