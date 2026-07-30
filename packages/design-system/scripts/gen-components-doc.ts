// Generates COMPONENTS.md from the component manifest so the public inventory —
// including which exports are wrappers around Ark UI / TanStack — stays in sync
// with the code. Run: `npm run docs:components`.
import { writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

import {
  designSystemComponentManifest,
  type DesignSystemBehaviorSource,
} from '../src/component-manifest.ts';

const here = dirname(fileURLToPath(import.meta.url));

const SECTIONS: Array<{
  source: DesignSystemBehaviorSource;
  title: string;
  blurb: string;
}> = [
  {
    source: 'design-system',
    title: 'Design-system components',
    blurb: 'Owned by this package — styled via Panda recipes/tokens.',
  },
  {
    source: 'ark-ui',
    title: 'Ark UI wrappers & re-exports',
    blurb:
      'Behaviour comes from [Ark UI](https://ark-ui.com). Some are skinned by this package (`styleOwner: design-system-preset`); the rest are re-exported unstyled (`styleOwner: consumer`) so you style them yourself.',
  },
  {
    source: 'tanstack-react-table',
    title: 'TanStack Table',
    blurb:
      'Behaviour comes from [@tanstack/react-table](https://tanstack.com/table); this package provides the styled `DataTable` shell.',
  },
];

const row = (e: (typeof designSystemComponentManifest)[number]): string =>
  `| \`${e.exportName}\` | ${e.styleOwner} | ${e.recipeKey ? `\`${e.recipeKey}\`` : '—'} | ${e.storyBucket ?? '—'} |`;

const lines: string[] = [
  '# Components',
  '',
  '> Generated from `src/component-manifest.ts` by `npm run docs:components`. Do not edit by hand.',
  '',
  `The package exports **${designSystemComponentManifest.length}** components. Some are owned here; others wrap Ark UI or TanStack Table so you depend on this package instead of those directly. \`Styled by\` = who owns the visuals (\`design-system-preset\` = a Panda recipe you can override; \`consumer\` = unstyled, you style it).`,
  '',
];

for (const section of SECTIONS) {
  const entries = designSystemComponentManifest.filter(
    (e) => e.behaviorSource === section.source,
  );
  if (entries.length === 0) continue;
  lines.push(`## ${section.title}`, '', section.blurb, '');
  lines.push('| Component | Styled by | Recipe | Story |', '| --- | --- | --- | --- |');
  for (const e of entries) lines.push(row(e));
  lines.push('');
}

lines.push(
  '## Charts',
  '',
  'Data visualisation lives in the separate [`@archon-research/charting`](../charting/README.md) package — a token-themed, curated [visx](https://airbnb.io/visx) surface (`XYChart`, `Axis`, `LineSeries`, …). See its README for the full export list.',
  '',
);

writeFileSync(join(here, '..', 'COMPONENTS.md'), lines.join('\n'));
console.log(
  `Wrote COMPONENTS.md (${designSystemComponentManifest.length} components).`,
);
