import reactConfig from '@archon-research/oxlint-config/react';

// NOTE: we would like a rule that flags `css()` (and recipe
// functions) called with a non-literal / indirected argument, because Panda's
// static extraction silently produces NO CSS for those calls. It is not
// enforceable with the current toolchain: oxlint 1.74.0 does not implement
// `no-restricted-syntax` (attempting it errors with "Rule 'no-restricted-syntax'
// not found in plugin 'eslint'") and has no stable custom-plugin API. Until one
// lands, this is a review-time guideline — see PANDA_NOTES.md for the rule
// we intend to add and the do/don't examples.
export default {
	...reactConfig,
};
