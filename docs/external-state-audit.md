# External-state coupling audit

Design-system components and hooks should be external-state agnostic: no hook
or component should read/write `window.location`, `history`, `localStorage`,
`sessionStorage`, or global events as its **only** mode of operation.
Consumers bring their own router/persistence; uikit pieces should accept an
injected interface, with browser-global behavior at most as an opt-in
default.

This audit sweeps every package in the monorepo for direct use of
`window.location`, `history.push`/`replaceState`, `localStorage`,
`sessionStorage`, `addEventListener('popstate' | 'hashchange' | 'storage')`,
and `URLSearchParams` writes, and records what each usage touches, whether an
injection seam already exists, and a recommended disposition. It does not
implement any of the recommendations — this is the spec for follow-up work.

## Method

```
rg -n "window\.location" packages
rg -n "history\.(push|replaceState)|pushState" packages
rg -n "localStorage" packages
rg -n "sessionStorage" packages
rg -n "addEventListener\('(popstate|hashchange|storage)'" packages
rg -n "URLSearchParams" packages
```

Story/demo code in `packages/uikit-preview/src/stories/**` and
`README.md` usage examples are excluded from the disposition column's
"needs work" categories — they are not part of the shipped component
contract.

## Findings

| Symbol | Package / file | Browser global touched | Injection seam today | Disposition |
| --- | --- | --- | --- | --- |
| `useHashRoute` | `packages/design-system/src/hooks/useHashRoute.ts` | `window.location.hash` (read), `window.location.hash =` (write), `window.addEventListener('hashchange', ...)` | None — the hook's entire purpose is to read/write the hash directly | **Deprecate.** Done in this change: marked `@deprecated`, kept for demo/preview use, behavior unchanged. |
| `useUrlSyncedTableStateAdapter`, `UrlSyncedTableStateAdapter` | `packages/design-system/src/components/data-table/hooks.ts`, `types.ts` | None directly — reads/writes go through the caller-supplied `adapter.sortParam`/`adapter.searchParam`/`adapter.setSortParam`/`adapter.setSearchParam` | Yes, full injected adapter; the hook never touches `window`/`history` itself | **Keep as-is with documented seam.** JSDoc added in this change to state the seam explicitly. |
| `useUrlSyncedFilterStore`, `UrlSyncedFilterAdapter` | `packages/design-system/src/filter-state/urlSync.ts` | None directly — reads/writes go through the caller-supplied `adapter.filtersParam`/`adapter.setFiltersParam` | Yes, full injected adapter, already documented (mirrors the table adapter) | **Keep as-is.** No change needed; existing JSDoc already states the seam. |
| `useFilterStore`, `FilterProvider`, `useFilterState` | `packages/design-system/src/filter-state/FilterProvider.tsx` | None — internal `useState` by default, or fully controlled via `state`/`onStateChange` (e.g. from `useUrlSyncedFilterStore`) | Yes, controlled/uncontrolled split; browser coupling only enters via the optional URL adapter layered on top | **Keep as-is.** Already the pattern this audit wants other hooks to follow. |
| `ThemeProvider` (`readInitialThemeMode`, mode-persist effect) | `packages/design-system/src/theme/ThemeProvider.tsx` | `window.localStorage.getItem`/`setItem` on fixed keys (`'theme'`, `'archon-theme'`); also `window.matchMedia` for system preference (read-only, not in scope of this audit's grep set but related) | None — keys are hardcoded constants, no way to swap the storage backend or opt out | **Add injected interface.** Follow-up: accept an optional storage adapter (`{ getItem, setItem }`-shaped) defaulting to `window.localStorage`, so a consumer can back theme persistence with cookies, a backend profile, or nothing. |
| `SidebarLayout` (`readNumberFromStorage`, resize-end persist) | `packages/design-system/src/layouts/SidebarLayout.tsx` | `window.localStorage.getItem`/`setItem` for `sidebarStorageKey`/`bottomPanelStorageKey` | Partial — the storage **key** is a prop (`sidebarStorageKey`, `bottomPanelStorageKey`), but the storage **backend** is hardcoded to `window.localStorage` | **Add injected interface.** Follow-up: extend the existing key props into a full storage-adapter prop (or accept a controlled `sidebarWidth`/`onSidebarWidthChange` pair, matching the `data-table`/`filter-state` controlled pattern) so non-localStorage persistence is possible. |
| `ErrorBoundary` reload button | `packages/design-system/src/components/ErrorBoundary.tsx` | `window.location.reload()` in the recovery button's `onClick` | None — no `onReset`/`onReload` prop exists | **Add injected interface.** Follow-up: accept an optional `onReset` prop, defaulting to `() => window.location.reload()`, so consumers with client-side routing can reset state without a full page reload. |
| `useRelaySession` | `packages/webmcp/src/useRelaySession.ts` | `localStorage.getItem`/`setItem`/`removeItem` on `options.storageKey` | Partial — the storage **key** is a required option, but the backend is hardcoded to `localStorage` | **Keep as-is with documented seam** (low priority). This hook's job is specifically to persist a relay session across browser reloads, so `localStorage` is core to its purpose rather than incidental; the key is already injectable. A full storage-adapter seam would be a reasonable follow-up but is lower priority than the design-system entries above since this package is not a UI primitive consumers compose arbitrarily. |
| `mcp-connect.stories.tsx` (`window.location.href`), `mcp-connect/README.md` (`window.location.origin` example) | `packages/uikit-preview/src/stories/organisms/mcp-connect.stories.tsx`, `packages/mcp-connect/README.md` | `window.location.href`, `window.location.origin` | N/A — story/demo code and a docs code sample, not shipped component behavior | **Keep as-is.** Preview stories and README examples are expected to reach for browser globals directly; out of scope for the design-system contract. |

## Explicitly checked, no findings

- **Playback** (`packages/design-system/src/playback/usePlayback.ts`, `components/PlaybackBar.tsx`): no `window`/`history`/`storage` usage.
- **`dashboard-kit`** package: no `window.location`, `history`, `localStorage`, `sessionStorage`, or relevant `addEventListener` usage.
- **`URLSearchParams` writes**: none found anywhere in `packages/`.
- **`history.push`/`replaceState`/`pushState`**: none found anywhere in `packages/`.
- **`sessionStorage`**: none found anywhere in `packages/`.

## Summary of recommended follow-up work (not implemented here)

1. `ThemeProvider` — add an injectable storage adapter, default `window.localStorage`.
2. `SidebarLayout` — add an injectable storage adapter (or a controlled width/height prop pair), default `window.localStorage`.
3. `ErrorBoundary` — add an `onReset` prop, default `() => window.location.reload()`.
4. `useRelaySession` (lower priority, `packages/webmcp`) — consider an injectable storage adapter alongside the existing `storageKey` option.

`useUrlSyncedTableStateAdapter`, `useUrlSyncedFilterStore`, and `useFilterStore`
already meet the bar and need no code changes; this change only extends their
JSDoc to state the seam explicitly (`data-table/hooks.ts`, `data-table/types.ts`).
`useHashRoute` is deprecated rather than fixed, since a hash-router hook has no
non-browser-coupled form — SSR-safety and `hashchange` sync are the entire
feature.
