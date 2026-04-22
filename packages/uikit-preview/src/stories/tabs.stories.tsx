import { Tabs } from '@archon-research/design-system';

export const BasicTabs = () => (
  <Tabs.Root defaultValue="overview" style={{ width: 360 }}>
    <Tabs.List
      style={{
        display: 'flex',
        gap: 8,
        marginBottom: 12,
        fontFamily: 'ui-sans-serif, system-ui, sans-serif',
      }}
    >
      <Tabs.Tab value="overview">Overview</Tabs.Tab>
      <Tabs.Tab value="api">API</Tabs.Tab>
      <Tabs.Tab value="usage">Usage</Tabs.Tab>
    </Tabs.List>
    <Tabs.Panel value="overview">Shared primitives and recipes.</Tabs.Panel>
    <Tabs.Panel value="api">Composable and headless by default.</Tabs.Panel>
    <Tabs.Panel value="usage">Use together with Panda tokens.</Tabs.Panel>
  </Tabs.Root>
);
