import reactConfig from '@archon-research/oxlint-config/react';

export default {
	...reactConfig,
	rules: {
		...reactConfig.rules,
		'no-restricted-imports': [
			'warn',
			{
				paths: [
					{
						name: '@ark-ui/react',
						message:
							'Import from @archon-research/design-system instead of @ark-ui/react.',
					},
				],
				patterns: [
					{
						group: ['@ark-ui/react/*'],
						message:
							'Import from @archon-research/design-system instead of @ark-ui/react subpaths.',
					},
				],
			},
		],
	},
};
