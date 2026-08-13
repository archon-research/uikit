import { describe, expect, it } from 'vitest';

import { shouldWarnMissingGetRowId } from './utils.js';

// `shouldWarnMissingGetRowId` is the pure decision core behind the dev-only
// "missing getRowId" warnings in `useDataTable` (row expansion) and
// `DataTable` (virtualization) — testable directly without rendering either.
// (This package has no RTL/jsdom harness, so the actual `console.warn`
// call sites and their "once per instance" ref-based gating aren't
// exercised by a render-based test here; this covers the condition logic
// those call sites delegate to.)

describe('shouldWarnMissingGetRowId', () => {
  it('warns when the feature condition is on and getRowId is missing', () => {
    expect(shouldWarnMissingGetRowId(true, false, false)).toBe(true);
  });

  it('is silent when getRowId is supplied', () => {
    expect(shouldWarnMissingGetRowId(true, true, false)).toBe(false);
  });

  it('is silent when the feature condition is off', () => {
    expect(shouldWarnMissingGetRowId(false, false, false)).toBe(false);
  });

  it('is silent once already warned, even if the condition still holds', () => {
    expect(shouldWarnMissingGetRowId(true, false, true)).toBe(false);
  });
});
