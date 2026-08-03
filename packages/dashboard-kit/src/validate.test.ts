import { describe, expect, it } from 'vitest';

import type { DashboardSpec } from './schema.js';
import { collectAgentWritableKeys, validateDashboardSpec } from './validate.js';

/**
 * A minimal, structurally valid spec: one widget placed by a single-widget
 * layout. Individual tests clone and mutate it to isolate one failure at a
 * time. Pure logic only — nothing here renders a component (DOM-free, matching
 * the repo's node-environment test style).
 */
function baseSpec(): DashboardSpec {
  return {
    version: 1,
    title: 'Sample',
    layout: { type: 'widget', ref: 'a' },
    widgets: {
      a: { id: 'a', component: 'note', props: { text: 'hello' } },
    },
  };
}

describe('validateDashboardSpec — structural', () => {
  it('accepts a minimal valid spec', () => {
    const result = validateDashboardSpec(baseSpec());
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.issues).toEqual([]);
  });

  it('accepts a nested split layout', () => {
    const spec: DashboardSpec = {
      version: 1,
      layout: {
        type: 'split',
        direction: 'row',
        children: [
          { type: 'widget', ref: 'a' },
          {
            type: 'split',
            direction: 'column',
            children: [{ type: 'widget', ref: 'b' }],
          },
        ],
      },
      widgets: {
        a: { id: 'a', component: 'note' },
        b: { id: 'b', component: 'stat' },
      },
    };
    expect(validateDashboardSpec(spec).ok).toBe(true);
  });

  it('rejects a wrong version literal', () => {
    const spec = { ...baseSpec(), version: 2 } as unknown;
    const result = validateDashboardSpec(spec);
    expect(result.ok).toBe(false);
  });

  it('rejects a malformed layout node (missing type)', () => {
    const spec = {
      version: 1,
      layout: { ref: 'a' },
      widgets: { a: { id: 'a', component: 'note' } },
    } as unknown;
    expect(validateDashboardSpec(spec).ok).toBe(false);
  });

  it('rejects a bad threshold enum', () => {
    const spec = baseSpec();
    spec.widgets.a.thresholds = [
      // @ts-expect-error — intentionally invalid op for the test
      { op: 'between', value: 1, severity: 'warning' },
    ];
    expect(validateDashboardSpec(spec).ok).toBe(false);
  });
});

describe('validateDashboardSpec — referential', () => {
  it('flags a layout ref with no matching widget', () => {
    const spec = baseSpec();
    spec.layout = { type: 'widget', ref: 'missing' };
    const result = validateDashboardSpec(spec);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((i) => i.path === 'layout.ref')).toBe(true);
      expect(result.issues[0]?.message).toContain('unknown widget');
    }
  });

  it('flags an orphaned widget never placed by the layout', () => {
    const spec = baseSpec();
    spec.widgets.orphan = { id: 'orphan', component: 'note' };
    const result = validateDashboardSpec(spec);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((i) => i.path === 'widgets.orphan')).toBe(true);
    }
  });

  it('flags a widget whose id disagrees with its registry key', () => {
    const spec = baseSpec();
    spec.widgets.a.id = 'mismatch';
    const result = validateDashboardSpec(spec);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((i) => i.path === 'widgets.a.id')).toBe(true);
    }
  });

  it('flags a resizable column split with no height', () => {
    const spec: DashboardSpec = {
      version: 1,
      layout: {
        type: 'split',
        direction: 'column',
        resizable: true,
        children: [{ type: 'widget', ref: 'a' }],
      },
      widgets: { a: { id: 'a', component: 'note' } },
    };
    const result = validateDashboardSpec(spec);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((i) => i.path.endsWith('.height'))).toBe(true);
    }
  });

  it('accepts a resizable column split that declares a height', () => {
    const spec: DashboardSpec = {
      version: 1,
      layout: {
        type: 'split',
        direction: 'column',
        resizable: true,
        height: '400px',
        children: [{ type: 'widget', ref: 'a' }],
      },
      widgets: { a: { id: 'a', component: 'note' } },
    };
    expect(validateDashboardSpec(spec).ok).toBe(true);
  });

  it('accepts a resizable ROW split without a height (row divides width)', () => {
    const spec: DashboardSpec = {
      version: 1,
      layout: {
        type: 'split',
        direction: 'row',
        resizable: true,
        children: [
          { type: 'widget', ref: 'a' },
          { type: 'widget', ref: 'b' },
        ],
      },
      widgets: {
        a: { id: 'a', component: 'note' },
        b: { id: 'b', component: 'stat' },
      },
    };
    expect(validateDashboardSpec(spec).ok).toBe(true);
  });
});

describe('validateDashboardSpec — agentWritable', () => {
  it('flags an agentWritable key not present in writes', () => {
    const spec = baseSpec();
    spec.widgets.a.interaction = {
      writes: ['highlightedKey'],
      agentWritable: ['selectedTimeRange'],
    };
    const result = validateDashboardSpec(spec);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.issues.some(
          (i) => i.path === 'widgets.a.interaction.agentWritable',
        ),
      ).toBe(true);
    }
  });

  it('accepts an agentWritable key that is also written', () => {
    const spec = baseSpec();
    spec.widgets.a.interaction = {
      writes: ['highlightedKey'],
      agentWritable: ['highlightedKey'],
    };
    expect(validateDashboardSpec(spec).ok).toBe(true);
  });
});

describe('validateDashboardSpec — knownComponents', () => {
  it('flags a component key outside the provided allow-list', () => {
    const spec = baseSpec();
    const result = validateDashboardSpec(spec, {
      knownComponents: ['stat', 'table'],
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.issues.some((i) => i.path === 'widgets.a.component')).toBe(
        true,
      );
    }
  });

  it('passes when every component key is known', () => {
    const spec = baseSpec();
    expect(validateDashboardSpec(spec, { knownComponents: ['note'] }).ok).toBe(
      true,
    );
  });
});

describe('collectAgentWritableKeys', () => {
  it('returns an empty set by default (default-deny)', () => {
    expect(collectAgentWritableKeys(baseSpec()).size).toBe(0);
  });

  it('unions agentWritable keys across every widget', () => {
    const spec: DashboardSpec = {
      version: 1,
      layout: {
        type: 'split',
        direction: 'row',
        children: [
          { type: 'widget', ref: 'a' },
          { type: 'widget', ref: 'b' },
        ],
      },
      widgets: {
        a: {
          id: 'a',
          component: 'table',
          interaction: {
            writes: ['highlightedKey'],
            agentWritable: ['highlightedKey'],
          },
        },
        b: {
          id: 'b',
          component: 'note',
          interaction: {
            writes: ['selectedTimeRange'],
            agentWritable: ['selectedTimeRange'],
          },
        },
      },
    };
    expect(collectAgentWritableKeys(spec)).toEqual(
      new Set(['highlightedKey', 'selectedTimeRange']),
    );
  });
});
