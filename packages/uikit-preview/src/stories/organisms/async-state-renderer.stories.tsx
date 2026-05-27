import {
  AsyncStateRenderer,
  EmptyState,
  ErrorState,
  LoadingIndicator,
} from '@archon-research/design-system';

import { css } from '../../../styled-system/css';

export default {
  title: 'Organisms/Async State Renderer',
};

const wrapperClassName = css({
  display: 'grid',
  gap: '4',
  p: '6',
  maxWidth: '3xl',
});

const successCardClassName = css({
  borderRadius: 'md',
  borderWidth: '1px',
  borderStyle: 'solid',
  borderColor: 'border.subtle',
  background: 'surface.default',
  px: '4',
  py: '3',
  color: 'text.default',
  fontSize: 'sm',
});

export const Loading = () => (
  <div className={wrapperClassName}>
    <AsyncStateRenderer
      isLoading
      loadingView={<LoadingIndicator message="Loading positions" />}
    >
      <div className={successCardClassName}>Loaded content</div>
    </AsyncStateRenderer>
  </div>
);

export const Error = () => (
  <div className={wrapperClassName}>
    <AsyncStateRenderer
      error="Request failed"
      isLoading={false}
      errorView={
        <ErrorState
          title="Unable to fetch data"
          description="Try refreshing this panel."
        />
      }
    >
      <div className={successCardClassName}>Loaded content</div>
    </AsyncStateRenderer>
  </div>
);

export const Empty = () => (
  <div className={wrapperClassName}>
    <AsyncStateRenderer
      isLoading={false}
      isEmpty
      emptyView={
        <EmptyState
          title="No data"
          description="No rows match the selected filters."
        />
      }
    >
      <div className={successCardClassName}>Loaded content</div>
    </AsyncStateRenderer>
  </div>
);

export const Success = () => (
  <div className={wrapperClassName}>
    <AsyncStateRenderer isLoading={false}>
      <div className={successCardClassName}>Loaded content</div>
    </AsyncStateRenderer>
  </div>
);
