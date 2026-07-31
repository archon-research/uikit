import { Select } from '@archon-research/design-system';

import { css } from '../../../styled-system/css';

export default {
  title: 'Molecules/Select',
};

const stackClassName = css({
  display: 'grid',
  gap: '5',
  maxWidth: 'sm',
  p: '6',
  fontFamily: 'sans',
  color: 'text.default',
});

const fieldClassName = css({
  display: 'grid',
  gap: '2',
});

const labelClassName = css({
  color: 'text.muted',
  fontSize: 'sm',
  fontWeight: 'medium',
  lineHeight: '1.4',
});

export const Default = () => (
  <div className={stackClassName}>
    <div className={fieldClassName}>
      <label className={labelClassName} htmlFor="project-status">
        Project status
      </label>
      <Select defaultValue="active" id="project-status">
        <option value="draft">Draft</option>
        <option value="active">Active</option>
        <option value="paused">Paused</option>
        <option value="archived">Archived</option>
      </Select>
    </div>
  </div>
);

export const Disabled = () => (
  <div className={stackClassName}>
    <div className={fieldClassName}>
      <label className={labelClassName} htmlFor="release-channel">
        Release channel
      </label>
      <Select defaultValue="stable" disabled id="release-channel">
        <option value="stable">Stable</option>
        <option value="beta">Beta</option>
        <option value="canary">Canary</option>
      </Select>
    </div>
  </div>
);

/**
 * regression cover: a consumer `className` must be able to override the
 * recipe's default `width: full`. Because recipe styles live in the `recipes`
 * cascade layer and `css()` in the `utilities` layer, `css({ width: '150px' })`
 * wins — which was impossible while the width came from an inline style.
 */
export const WidthOverride = () => (
  <div className={stackClassName}>
    <div className={fieldClassName}>
      <label className={labelClassName} htmlFor="page-size">
        Page size
      </label>
      <Select
        className={css({ width: '150px' })}
        defaultValue="25"
        id="page-size"
      >
        <option value="10">10</option>
        <option value="25">25</option>
        <option value="50">50</option>
        <option value="100">100</option>
      </Select>
    </div>
  </div>
);
