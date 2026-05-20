import reactConfig from "./react.js";

const designSystemBoundariesConfig = {
  ...reactConfig,
  rules: {
    ...reactConfig.rules,
    // Phase 2: warn consumers when they bypass design-system entrypoints.
    "no-restricted-imports": [
      "warn",
      {
        paths: [
          {
            name: "@base-ui/react",
            message: "Import from @archon-research/design-system instead of @base-ui/react.",
          },
          {
            name: "@ark-ui/react",
            message: "Import from @archon-research/design-system instead of @ark-ui/react.",
          },
        ],
        patterns: [
          {
            group: ["@base-ui/react/*"],
            message:
              "Import from @archon-research/design-system instead of @base-ui/react subpaths.",
          },
          {
            group: ["@ark-ui/react/*"],
            message:
              "Import from @archon-research/design-system instead of @ark-ui/react subpaths.",
          },
        ],
      },
    ],
  },
};

export default designSystemBoundariesConfig;
