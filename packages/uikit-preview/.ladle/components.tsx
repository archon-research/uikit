import type { ReactNode } from 'react';

import '../styled-system/styles.css';

type ProviderProps = {
  children: ReactNode;
};

export function Provider({ children }: ProviderProps) {
  return children;
}
