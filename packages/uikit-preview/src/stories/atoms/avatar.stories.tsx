import { Avatar } from '@archon-research/design-system';

import { css } from '../../../styled-system/css';

export default {
  title: 'Atoms/Avatar',
};

const frameClassName = css({
  display: 'grid',
  gap: '5',
  p: '6',
  fontFamily: 'sans',
});

const rowClassName = css({
  alignItems: 'center',
  display: 'flex',
  gap: '4',
});

const avatarClassName = css({
  background: 'surface.default',
  borderColor: 'border.default',
  borderRadius: 'full',
  borderWidth: '1px',
  color: 'text.default',
  display: 'inline-flex',
  fontSize: 'sm',
  fontWeight: 'semibold',
  height: '10',
  justifyContent: 'center',
  overflow: 'hidden',
  width: '10',
});

const imageClassName = css({
  height: 'full',
  objectFit: 'cover',
  width: 'full',
});

const labelClassName = css({
  color: 'text.default',
  fontSize: 'sm',
  fontWeight: 'medium',
});

export const WithImage = () => (
  <div className={frameClassName}>
    <div className={rowClassName}>
      <Avatar.Root className={avatarClassName}>
        <Avatar.Fallback>AR</Avatar.Fallback>
        <Avatar.Image
          alt="Archon user"
          className={imageClassName}
          src="https://i.pravatar.cc/80?img=12"
        />
      </Avatar.Root>
      <span className={labelClassName}>Signed in user</span>
    </div>
  </div>
);

export const Fallback = () => (
  <div className={frameClassName}>
    <div className={rowClassName}>
      <Avatar.Root className={avatarClassName}>
        <Avatar.Fallback>UI</Avatar.Fallback>
      </Avatar.Root>
      <span className={labelClassName}>Fallback initials</span>
    </div>
  </div>
);
