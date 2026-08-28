# uikit preview

This workspace package builds and publishes a static preview site for UIKit.

It combines:

- Ladle stories for interactive component previews
- A generated Panda Spec JSON documentation view

The preview reuses the shared Panda theme config from the design-system package.

## Local development

From repository root:

```bash
npm run preview:dev
```

## Static build

```bash
npm run preview:build
```

The output is generated at `packages/uikit-preview/dist`.

## Visual snapshot tests

Ladle stories are screenshot-tested with Playwright. The committed snapshots are
macOS/Chromium-specific, so regenerate them on macOS.

From this package:

```bash
npm run snapshot:test           # compare against the committed snapshots
npm run snapshot:update         # re-render only the snapshots a change affects
npm run snapshot:update:all     # re-render every snapshot
npm run snapshot:check-orphans  # flag snapshots with no matching story
```
