# uikit

Shared frontend toolkit monorepo for TypeScript and React projects.

It contains shared build configuration, a Panda CSS design-system with charting and dashboard layers on top, typed HTTP client utilities, router helpers, and a WebMCP stack for exposing in-app tools to AI harnesses.

Live preview: https://archon-research.github.io/uikit/

## Repository layout

```text
packages/
  tsconfig/         Shared TypeScript configs (base, react, node)
  oxlint-config/    Shared Oxlint configs (base, react)
  oxfmt-config/     Shared Oxfmt config
  agent-marketplace/ Plugin marketplace content and generators (private)
  design-system/    Shared UI components and style recipes
  charting/         Dedicated charting primitives package
  dashboard-kit/    Schema-driven dashboard registry and renderer
  uikit-preview/    Ladle preview site for components and tokens (private)
  http-client-core/ OpenAPI + Zod based HTTP client helpers
  http-client-react/React Query integration on top of core client
  http-client-msw/  Typed MSW mocks keyed off the same OpenAPI paths type
  router-kit/       Search-param schemas, URL cleanup, and router test harness
  webmcp/           WebMCP UI tool-registration layer (document.modelContext)
  mcp-connect/      Harness connection UI (chat icon, status, connect modal)
  mcp-relay/        Host-agnostic WebMCP relay protocol core (sans-I/O, TS)
  uikit-cli/        CLI for local package linking in consumer repos
```

## Packages

Published to npm:

- `@archon-research/tsconfig`
- `@archon-research/oxlint-config`
- `@archon-research/oxfmt-config`
- `@archon-research/design-system`
- `@archon-research/charting`
- `@archon-research/dashboard-kit`
- `@archon-research/http-client-core`
- `@archon-research/http-client-react`
- `@archon-research/http-client-msw`
- `@archon-research/router-kit`
- `@archon-research/webmcp`
- `@archon-research/mcp-connect`
- `@archon-research/mcp-relay`
- `@archon-research/uikit-cli`

Private to this repository, not published:

- `@archon-research/uikit-preview` — the Ladle preview site
- `@archon-research/agent-marketplace` — plugin content and generators

If you are adapting this template for another organization, you can replace the package scope and names while keeping the same structure and workflows.

## Installation

Install packages from npm:

```bash
npm install @archon-research/tsconfig @archon-research/oxlint-config @archon-research/oxfmt-config @archon-research/design-system @archon-research/charting @archon-research/dashboard-kit @archon-research/http-client-core @archon-research/http-client-react @archon-research/http-client-msw @archon-research/router-kit @archon-research/webmcp @archon-research/mcp-connect @archon-research/mcp-relay @archon-research/uikit-cli
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
- [charting](./packages/charting/README.md)
- [dashboard-kit](./packages/dashboard-kit/README.md)
- [http-client-core](./packages/http-client-core/README.md)
- [http-client-react](./packages/http-client-react/README.md)
- [http-client-msw](./packages/http-client-msw/README.md)
- [router-kit](./packages/router-kit/README.md)
- [webmcp](./packages/webmcp/README.md)
- [mcp-connect](./packages/mcp-connect/README.md)
- [mcp-relay](./packages/mcp-relay/README.md)
- [uikit-cli](./packages/uikit-cli/README.md)

## Development

For local development, contributing to packages, running quality checks, and publishing, see [DEVELOPMENT.md](./DEVELOPMENT.md).

## Agent marketplace plugins

The repository includes an internal marketplace package that generates plugin artifacts for Claude Code and GitHub Copilot CLI:

- [packages/agent-marketplace](./packages/agent-marketplace/README.md)

Use it to manage normalized skill and agent content, source pinning metadata, and generated plugin outputs for both ecosystems.

## Icon policy

- Use `lucide-react` for all product and story iconography.
- Do not introduce emoji icons or ad hoc inline SVG icon implementations in components/stories.

### Recommended install flow (GitHub marketplace)

Prefer marketplace-based installs from GitHub over direct local-path installs.

- Claude Code team marketplaces:
  - https://code.claude.com/docs/en/discover-plugins#configure-team-marketplaces
- Copilot plugin marketplaces:
  - https://docs.github.com/en/copilot/how-tos/copilot-cli/customize-copilot/plugins-marketplace

For this repository, publish or reference the marketplace metadata in `.claude-plugin/marketplace.json` and `.github/plugin/marketplace.json`, then install by plugin name from the configured marketplace.
