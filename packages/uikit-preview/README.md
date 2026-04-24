# uikit preview

This workspace package builds and publishes a static preview site for UIKit.

It combines:

- Ladle stories for interactive component previews
- Panda Studio for token/theme exploration
- A generated Panda Spec JSON documentation view

The preview reuses the shared Panda theme config from the design-system package.

## Local development

From repository root:

```bash
npm run preview:dev:stories
npm run preview:dev:studio
```

## Static build

```bash
npm run preview:build
```

The output is generated at `packages/uikit-preview/dist`.
