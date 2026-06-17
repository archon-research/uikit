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
  agent-marketplace/Plugin marketplace content and generators
  design-system/    Shared UI components and style recipes
  charting/         Dedicated charting primitives package
  uikit-preview/    Ladle preview site for components and tokens
  http-client-core/ OpenAPI + Zod based HTTP client helpers
  http-client-react/React Query integration on top of core client
  webmcp/           WebMCP UI tool-registration layer (document.modelContext)
  mcp-connect/      Harness connection UI (chat icon, status, connect modal)
  mcp-relay/        Host-agnostic WebMCP relay protocol core (sans-I/O, TS)
  mcp-relay-python/ Python relay core (webmcp_relay), conformance-paired with mcp-relay
  uikit-cli/        CLI for local package linking in consumer repos
```

## Packages

- `@archon-research/tsconfig`
- `@archon-research/oxlint-config`
- `@archon-research/oxfmt-config`
- `@archon-research/design-system`
- `@archon-research/charting`
- `@archon-research/uikit-preview`
- `@archon-research/http-client-core`
- `@archon-research/http-client-react`
- `@archon-research/webmcp`
- `@archon-research/mcp-connect`
- `@archon-research/mcp-relay`
- `@archon-research/uikit-cli`

The `mcp-relay-python` package (published as `webmcp-relay`) is a Python port of the relay core, kept in lockstep with `@archon-research/mcp-relay` via a shared conformance suite.

If you are adapting this template for another organization, you can replace the package scope and names while keeping the same structure and workflows.

## Installation

Install packages from npm:

```bash
npm install @archon-research/tsconfig @archon-research/oxlint-config @archon-research/oxfmt-config @archon-research/design-system @archon-research/charting @archon-research/http-client-core @archon-research/http-client-react @archon-research/webmcp @archon-research/mcp-connect @archon-research/uikit-cli
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
- [http-client-core](./packages/http-client-core/README.md)
- [http-client-react](./packages/http-client-react/README.md)
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
