# uikit

Shared frontend toolkit monorepo for TypeScript and React projects.

It contains reusable configuration packages, a UI design-system package, and HTTP client utilities that can be consumed directly from source during local development.

Live preview: https://archon-research.github.io/uikit/

## Repository layout

```text
packages/
  tsconfig/         Shared TypeScript configs (base, react, node)
  oxlint-config/    Shared Oxlint configs (base, react)
  oxfmt-config/     Shared Oxfmt config
  design-system/    Shared UI components and style recipes
  uikit-preview/    Ladle preview site for components and tokens
  http-client-core/ OpenAPI + Zod based HTTP client helpers
  http-client-react/React Query integration on top of core client
  uikit-cli/        CLI for local package linking in consumer repos
```

## Packages

- `@archon-research/tsconfig`
- `@archon-research/oxlint-config`
- `@archon-research/oxfmt-config`
- `@archon-research/design-system`
- `@archon-research/uikit-preview`
- `@archon-research/http-client-core`
- `@archon-research/http-client-react`
- `@archon-research/uikit-cli`

If you are adapting this template for another organization, you can replace the package scope and names while keeping the same structure and workflows.

## Installation

Install packages from npm:

```bash
npm install @archon-research/tsconfig @archon-research/oxlint-config @archon-research/oxfmt-config @archon-research/design-system @archon-research/http-client-core @archon-research/http-client-react @archon-research/uikit-cli
```

Each package has its own npm page with detailed documentation and usage examples.

### Installation from source (development)

To install and contribute to this monorepo from GitHub source, see [DEVELOPMENT.md](./DEVELOPMENT.md).

Note: Installing from GitHub source requires authentication to GitHub Packages via a personal access token (PAT). See [DEVELOPMENT.md](./DEVELOPMENT.md) for setup details.

## Usage

### Using packages from npm

See the individual package READMEs for specific usage examples:
- [tsconfig](./packages/tsconfig/README.md)
- [oxlint-config](./packages/oxlint-config/README.md)
- [oxfmt-config](./packages/oxfmt-config/README.md)
- [design-system](./packages/design-system/README.md)
- [http-client-core](./packages/http-client-core/README.md)
- [http-client-react](./packages/http-client-react/README.md)
- [uikit-cli](./packages/uikit-cli/README.md)

## Development

For local development, contributing to packages, running quality checks, and publishing, see [DEVELOPMENT.md](./DEVELOPMENT.md).
