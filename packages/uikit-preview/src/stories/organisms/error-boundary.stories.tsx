import { ErrorBoundary } from '@archon-research/design-system';

import { css } from '../../../styled-system/css';

export default {
  title: 'Organisms/Error Boundary',
};

const wrapperClassName = css({
  p: '6',
  maxWidth: '3xl',
});

function ThrowsOnRender(): never {
  throw new Error('Intentional render error from story demo');
}

function renderErrorFallback(error: Error, resetError: () => void) {
  return (
    <div>
      <p>{error.message}</p>
      <button type="button" onClick={resetError}>
        Reset
      </button>
    </div>
  );
}

export const CustomFallback = () => (
  <div className={wrapperClassName}>
    <ErrorBoundary fallback={renderErrorFallback}>
      <ThrowsOnRender />
    </ErrorBoundary>
  </div>
);
