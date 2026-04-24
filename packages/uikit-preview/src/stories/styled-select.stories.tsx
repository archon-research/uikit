import { StyledSelect } from '@archon-research/design-system';

import { css } from '../../styled-system/css';

export default {
  title: 'Components/Styled Select',
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
      <StyledSelect defaultValue="active" id="project-status">
        <option value="draft">Draft</option>
        <option value="active">Active</option>
        <option value="paused">Paused</option>
        <option value="archived">Archived</option>
      </StyledSelect>
    </div>
  </div>
);

export const Disabled = () => (
  <div className={stackClassName}>
    <div className={fieldClassName}>
      <label className={labelClassName} htmlFor="release-channel">
        Release channel
      </label>
      <StyledSelect defaultValue="stable" disabled id="release-channel">
        <option value="stable">Stable</option>
        <option value="beta">Beta</option>
        <option value="canary">Canary</option>
      </StyledSelect>
    </div>
  </div>
);
