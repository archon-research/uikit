import { ErrorState } from '@archon-research/design-system';

import { css } from '../../../styled-system/css';

export default {
  title: 'Organisms/Error State',
};

const wrapperClassName = css({
  display: 'grid',
  gap: '4',
  p: '6',
  maxWidth: '3xl',
});

export const Default = () => (
  <div className={wrapperClassName}>
    <ErrorState
      title="Unable to load positions"
      description="The backend returned an error while fetching the requested account positions."
      errorMessage="Request failed with status 503"
    />
  </div>
);

export const WithRetry = () => (
  <div className={wrapperClassName}>
    <ErrorState
      title="Unable to load risk breakdown"
      description="Try again in a moment. If this keeps happening, contact support."
      onRetry={() => {
        window.alert('Retry action triggered');
      }}
    />
  </div>
);
