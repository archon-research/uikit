import { Tabs } from '@archon-research/design-system';

import '../../styled-system/styles.css';
import { css } from '../../styled-system/css';

const rootClassName = css({
  display: 'grid',
  gap: '4',
  maxWidth: 'md',
});

const listClassName = css({
  display: 'flex',
  gap: '2',
});

const tabClassName = css({
  borderColor: 'border.default',
  borderRadius: 'md',
  borderStyle: 'solid',
  borderWidth: '1px',
  px: '3',
  py: '2',
});

const panelClassName = css({
  borderColor: 'border.default',
  borderRadius: 'lg',
  borderStyle: 'solid',
  borderWidth: '1px',
  p: '4',
});

export const BasicTabs = () => (
  <Tabs.Root className={rootClassName} defaultValue="overview">
    <Tabs.List className={listClassName}>
      <Tabs.Tab className={tabClassName} value="overview">
        Overview
      </Tabs.Tab>
      <Tabs.Tab className={tabClassName} value="api">
        API
      </Tabs.Tab>
      <Tabs.Tab className={tabClassName} value="usage">
        Usage
      </Tabs.Tab>
    </Tabs.List>
    <Tabs.Panel className={panelClassName} value="overview">
      Shared primitives and recipes.
    </Tabs.Panel>
    <Tabs.Panel className={panelClassName} value="api">
      Composable and headless by default.
    </Tabs.Panel>
    <Tabs.Panel className={panelClassName} value="usage">
      Use together with Panda tokens.
    </Tabs.Panel>
  </Tabs.Root>
);
