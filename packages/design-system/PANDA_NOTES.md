# Panda CSS notes & gotchas

Field notes for anyone building UI on `@archon-research/design-system` + Panda CSS.
These are the non-obvious traps that have already cost real debugging time. Read them
before you file a "styles aren't applying" bug — the cause is almost always one of these.

---

## Recipe variants driven by runtime state generate NO CSS (the worst one)

**Symptom:** a recipe variant that is toggled at runtime silently renders with no styling.
The class name lands on the element, but there is no rule behind it. Example: a selected
list row measured `background-color: rgba(0, 0, 0, 0)` — fully transparent — even though the
recipe clearly defines `selected: { true: { bg: 'interactive.selected' } }`.

**Cause:** Panda extracts CSS *statically* at build time. When you write:

```tsx
interactiveItem({ selected: isActive }) // isActive is only known at runtime
```

Panda cannot resolve `isActive` to `true`/`false` while scanning source, so it never emits the
`--selected_true` rule. The variant compiles to nothing. **It fails silently** — no error, no
warning, just missing styles.

**Fix:** pre-generate every variant combination for that recipe with `staticCss` in
`panda.config.ts` (see the PostCSS section below for why it must live there, not in the preset):

```ts
// panda.config.ts
export default defineConfig({
  ...designSystemPandaConfig,
  staticCss: {
    recipes: {
      interactiveItem: ['*'], // '*' = emit all variants unconditionally
      // ...one entry for EVERY recipe you drive with runtime state
    },
  },
});
```

`['*']` tells Panda to emit every variant of the recipe regardless of static usage, so the
runtime toggle always has a rule to hit. You can scope it tighter
(`[{ selected: ['true', 'false'] }]`) but `'*'` is the safe default for interactive recipes.

> Note: `['*']` covers single variants only — it does NOT emit `compoundVariants` combinations.
> Because these components apply recipe classes as strings (they never call the recipe function),
> a recipe that relies on compoundVariants would silently produce no CSS for those combinations.
> Prefer non-empty single variants the component selects explicitly over compoundVariants.

### Two structural aggravations to be aware of

1. **`staticCss` is a ROOT-config key — a Panda *preset* cannot carry it.** Panda intentionally
   ignores `staticCss` declared inside a preset. That means `@archon-research/design-system`'s
   preset **cannot** guarantee this coverage for you. **Every consumer must add `staticCss` to
   its own `panda.config.ts` independently.** Do not assume installing the preset is enough.
2. **Any recipe used with a runtime-driven variant needs an entry.** Static, literal usage
   (`button({ variant: 'solid' })` with a literal) is extracted fine and does *not* need
   `staticCss`. It is specifically dynamic/indirected variant values that vanish.

### Recommended posture for this repo

- The design-system's own `panda.shared.ts` ships `staticCss` coverage for its recipes
  (`button`, `toggleSwitch`, …). If you export a new recipe that has a runtime-toggled variant
  (like `interactiveItem`'s `selected`), it MUST be added to that `staticCss.recipes` map.
- **Consumers should mirror the design-system's `staticCss` coverage** in their own
  `panda.config.ts`. When in doubt, list every recipe you import with `['*']`.

---

## App base styles MUST go in `@layer base` (unlayered CSS beats layered Panda)

**Symptom:** a plain global style silently overrides a Panda utility even though the Panda class
is "more specific" or applied directly on the element. A real case: a bare
`button { font: inherit }` in an app stylesheet silently overrode `font_mono` set via Panda —
the button rendered in the wrong font with no obvious cause.

**Cause:** CSS cascade layers. Panda emits everything inside named layers, declared in this order:

```css
@layer reset, base, tokens, recipes, utilities;
```

**Any unlayered CSS wins over ALL layered CSS**, regardless of specificity — that is how the
cascade-layer spec works. So a plain `button { font: inherit }` (unlayered) beats
`.font_mono { font-family: ... }` (which lives in Panda's `utilities` layer), even though the
utility looks like it should apply.

**Fix:** put ALL of your app's global/base styles inside `@layer base` so they participate in
the cascade at the right priority and Panda utilities can override them:

```css
/* app global stylesheet */
@layer base {
  button {
    font: inherit;
  }
  /* ...all other global element styles... */
}
```

Rule of thumb: **never ship unlayered global CSS in a Panda app.** Wrap resets, element
defaults, and third-party base styles in `@layer base` (or an earlier layer). Unlayered rules
are a footgun that silently defeat the design system.

---

## Panda breakpoints are min-width only (mobile-first); invert your max-width queries

**Symptom:** a responsive style written as if it were a max-width query applies at the wrong
sizes (e.g. a "mobile only" tweak also shows up on desktop, or vice-versa).

**Cause:** Panda's breakpoints are **min-width, mobile-first**. The default scale is:

| Token | Min-width |
| --- | --- |
| `sm` | 640px |
| `md` | 768px |
| `lg` | 1024px |
| `xl` | 1280px |
| `2xl` | 1536px |

`css({ color: 'red', lg: { color: 'blue' } })` means: red by default, blue **at ≥1024px and up**.
There is no built-in max-width breakpoint. `lg` is **not** "large screens only" — it is
"1024px and wider".

**Fix — invert to mobile-first.** A max-width query like "apply X below 1024px" becomes: put X
in `base`, then undo/override it at `lg`:

```ts
// WRONG mental model: "X only below lg"
// RIGHT: base is the narrow case, lg overrides for wide
css({
  flexDirection: 'column', // narrow / mobile default (< 1024px)
  lg: {
    flexDirection: 'row', // >= 1024px
  },
});
```

**Escape hatch** — if you genuinely need a raw max-width query, Panda passes arbitrary at-rules
through:

```ts
css({
  '@media (max-width: 1023px)': { display: 'none' },
});
```

Prefer the mobile-first inversion; reserve the raw `@media` for the rare true max-width case.

---

## `css()` only works with STATIC, LITERAL arguments (no indirection)

**Symptom:** a `css()` call produces no CSS — the element gets a class name (or an empty
string) but no rule is generated. Common when the style object is built up in a variable,
spread, or returned from a helper.

**Cause:** the same static-extraction limitation as the runtime-variant gotcha above. Panda
reads the *source text* of `css()` calls at build time. If the argument is not an inline object
literal, Panda cannot see the properties and emits nothing:

```ts
// ✗ NONE of these extract — silently produce no CSS:
const styles = { color: 'text.default' };
css(styles); // indirected via a variable

const base = { padding: '2' };
css({ ...base, color: 'red' }); // spread of a non-inline object

function makeStyles(c: string) {
  return css({ color: c }); // dynamic value the compiler can't resolve
}

const key = 'color';
css({ [key]: 'red' }); // computed property key
```

```ts
// ✓ DO — inline object literal with literal values:
css({ color: 'text.default', padding: '2' });

// ✓ For conditional styles, pass literal branches (both are extracted):
css(isActive ? { color: 'text.interactive' } : { color: 'text.muted' });

// ✓ For runtime-varying tokens, prefer a RECIPE with staticCss (see the
//   runtime-variant section above), or set the value via a CSS custom property
//   / inline style, not css().
```

### Why there is no automated lint rule for this (yet)

We investigated adding an oxlint rule to `packages/design-system/oxlint.config.ts` that flags
`css()` called with a non-literal argument. **It is not currently feasible** with our toolchain:

- oxlint `1.74.0` does **not** implement `no-restricted-syntax` (the ESLint rule that would let
  us write an AST selector such as
  `CallExpression[callee.name='css'] > :not(ObjectExpression)`). Attempting to configure it
  fails with `Rule 'no-restricted-syntax' not found in plugin 'eslint'`.
- oxlint `1.74.0` has no stable custom-JS-plugin API either, so we cannot ship a bespoke rule.

**Guideline (enforce in review):** always call `css()` (and recipe functions) with an **inline
object literal**. Never pass a variable, a spread of a non-inline object, a computed key, or a
value the compiler can't resolve statically. If a style truly must vary at runtime, use a recipe
variant covered by `staticCss` or a CSS custom property — not `css()` indirection.

Revisit the automated rule once oxlint ships `no-restricted-syntax` or a stable plugin API; the
selector above is the intended implementation. A pointer to this note lives in
`oxlint.config.ts`.

---

## New utility classes require a manual `npm run generate` (adopt the PostCSS plugin)

**Symptom:** you add a new `css({ ... })` call (or a new utility) in a story/app, but the class
has no styles until you stop the dev server and re-run `npm run generate`. The DX paper cut:
edits don't hot-reload their CSS.

**Cause:** the preview currently uses Panda's **static** pipeline. `npm run generate` runs
`panda cssgen` once to write a frozen `styled-system/styles.css`, and `.ladle/components.tsx`
imports that static file. Vite/Ladle serve the frozen file, so any newly-extracted utility is
absent until the next manual `cssgen`.

### Does the design-system *library* need the PostCSS plugin? No.

`@archon-research/design-system` **emits no CSS of its own.** Its `build` script is just
`tsc -p tsconfig.build.json`; it ships `dist` + `src` (compiled components, the Panda **preset**,
and **recipe** source). There is no `styled-system/` in the package (it is gitignored) and no
`cssgen` step. CSS is always generated by the **consumer** that installs the preset. So
`@pandacss/postcss` is **not applicable to the library** — there is nothing for it to process
here, and no dependency/script change to `packages/design-system/package.json` is warranted.

**The PostCSS plugin belongs in the CSS-emitting consumer** (`uikit-preview`, and any downstream
app). That is where the fix lives.

### Ready-to-apply wiring for `uikit-preview` (and any downstream app)

No new dependency is required — `@pandacss/dev` (already a devDependency of `uikit-preview`)
ships the plugin at `@pandacss/dev/postcss`.

**1. Add a PostCSS config at the package root** (Vite/Ladle auto-detect it). A ready-to-use file
has been provided at `packages/uikit-preview/postcss.config.cjs.example` — rename it to
`postcss.config.cjs`:

```js
// postcss.config.cjs
module.exports = {
  plugins: {
    '@pandacss/dev/postcss': {},
  },
};
```

**2. Replace the frozen-CSS import with a Panda entry stylesheet.** Create
`packages/uikit-preview/src/index.css` containing only the layer declaration:

```css
@layer reset, base, tokens, recipes, utilities;
```

Then change `.ladle/components.tsx`:

```diff
-import '../styled-system/styles.css';
+import '../src/index.css';
```

The PostCSS plugin scans your `include` globs on every build and injects the generated layers
into this entry file. Because Vite runs PostCSS on change with HMR, new `css()`/recipe usage
now appears **without** a manual `npm run generate`.

**3. Simplify the `generate` script.** With PostCSS handling `cssgen`, the script only needs
`panda codegen` (for the `styled-system/` runtime: the `css()` fn, recipe fns, tokens) plus the
token spec, and can drop the `cssgen --outfile styled-system/styles.css` half:

```diff
-"generate": "panda codegen --clean --config panda.config.ts && panda cssgen --config panda.config.ts --outfile styled-system/styles.css && panda spec --config panda.config.ts --outdir ./static/tokens/spec",
+"generate": "panda codegen --clean --config panda.config.ts && panda spec --config panda.config.ts --outdir ./static/tokens/spec",
```

> Note: steps 2 and 3 (and the `generate` script edit) touch files owned by the preview package,
> not this one, so they must be applied by whoever owns `uikit-preview`. The `.example` config
> above is inert until renamed, so it will not change the current static pipeline on its own.

### Caveat — `staticCss` still matters under PostCSS

Switching to PostCSS does **not** fix the runtime-variant gotcha. PostCSS still extracts
statically; runtime-driven recipe variants still need `staticCss` coverage (see the
runtime-variant section above). PostCSS only removes the *manual regen* step; it does not make
dynamic variant values resolvable.
