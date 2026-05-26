# agent-marketplace

Marketplace-first plugin package for reusable UI-focused skills and specialist agents.

This package keeps all source content in one normalized layer and generates:

- Claude plugin output
- Copilot CLI plugin output
- Claude marketplace manifest (repo root)
- Copilot CLI marketplace manifest (repo root)

## Structure

```text
packages/agent-marketplace/
  content/
    skills/<skill>/SKILL.md
    agents/<agent>.md
  scripts/
    generate.mjs
    refresh.mjs
  sources.json
  sources.lock.json
  claude-plugin/        # generated
  copilot-plugin/       # generated
```

## Commands

From repository root:

```bash
npm run generate --workspace @archon-research/agent-marketplace
```

```bash
npm run refresh --workspace @archon-research/agent-marketplace
```

```bash
npm run refresh:dry-run --workspace @archon-research/agent-marketplace
```

## Source Registry Model

`sources.json` tracks:

- logical id
- kind (`skill` or `agent`)
- source type
- upstream location
- pinned revision
- normalization notes

`sources.lock.json` is generated from `sources.json` and records resolved source pointers used for reproducible output generation.

## Add New Skill

1. Add normalized content in `content/skills/<new-skill>/SKILL.md`.
2. Add source metadata in `sources.json`.
3. Run refresh:

```bash
npm run refresh --workspace @archon-research/agent-marketplace
```

## Validation Checklist

- `claude plugin validate /Users/rohit/Code/uikit`
- `claude plugin validate /Users/rohit/Code/uikit/packages/agent-marketplace/claude-plugin`
- `copilot plugin install /Users/rohit/Code/uikit/packages/agent-marketplace/copilot-plugin`

If CLI validation schemas evolve, keep generation stable and only adjust manifest fields.
