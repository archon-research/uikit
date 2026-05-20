import { type ReactNode } from 'react';

type AsyncStateRendererProps = {
  isLoading: boolean;
  error?: string | null;
  isEmpty?: boolean;
  loadingView?: ReactNode;
  errorView?: ReactNode;
  emptyView?: ReactNode;
  children: ReactNode;
};

export function AsyncStateRenderer({
  isLoading,
  error,
  isEmpty = false,
  loadingView = null,
  errorView = null,
  emptyView = null,
  children,
}: AsyncStateRendererProps) {
  if (isLoading) {
    return loadingView;
  }

  if (error) {
    return errorView;
  }

  if (isEmpty) {
    return emptyView;
  }

  return children;
}
