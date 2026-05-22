import { Menu } from '@archon-research/design-system';

import { css } from '../../../styled-system/css';

export default {
  title: 'Molecules/Menu',
};

const frameClassName = css({
  display: 'grid',
  gap: '4',
  p: '6',
  fontFamily: 'sans',
});

const triggerClassName = css({
  background: 'surface.default',
  borderColor: 'border.default',
  borderRadius: 'md',
  borderWidth: '1px',
  color: 'text.default',
  cursor: 'pointer',
  fontSize: 'sm',
  fontWeight: 'medium',
  px: '3',
  py: '2',
  width: 'fit-content',
});

const contentClassName = css({
  background: 'surface.default',
  borderColor: 'border.default',
  borderRadius: 'md',
  borderWidth: '1px',
  boxShadow: 'md',
  display: 'grid',
  gap: '1',
  minWidth: '40',
  p: '2',
});

const itemClassName = css({
  borderRadius: 'sm',
  color: 'text.default',
  cursor: 'pointer',
  fontSize: 'sm',
  px: '2',
  py: '1.5',
});

const hintClassName = css({
  color: 'text.muted',
  fontSize: 'xs',
  lineHeight: '1.4',
});

export const Open = () => (
  <div className={frameClassName}>
    <Menu.Root open positioning={{ placement: 'bottom-start' }}>
      <Menu.Trigger className={triggerClassName}>Actions</Menu.Trigger>
      <Menu.Positioner>
        <Menu.Content className={contentClassName}>
          <Menu.Item className={itemClassName} value="rename">
            Rename
          </Menu.Item>
          <Menu.Item className={itemClassName} value="duplicate">
            Duplicate
          </Menu.Item>
          <Menu.Item className={itemClassName} value="archive">
            Archive
          </Menu.Item>
        </Menu.Content>
      </Menu.Positioner>
    </Menu.Root>
    <p className={hintClassName}>Menu is forced open for snapshot coverage.</p>
  </div>
);
