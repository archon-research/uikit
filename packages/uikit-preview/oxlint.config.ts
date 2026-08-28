import boundariesConfig from '@archon-research/oxlint-config/design-system-boundaries';

// The ark-ui boundary was previously hand-copied here at `warn`, which is both
// the preset's own content duplicated and a severity oxlint cannot fail on.
// This is the preset's single real consumer, so it is also where the preset
// gets exercised.
export default {
	...boundariesConfig,
};
