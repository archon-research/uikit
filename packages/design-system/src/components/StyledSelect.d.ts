import type { ReactNode, SelectHTMLAttributes } from 'react';

export type StyledSelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  children: ReactNode;
  className?: string;
};

export declare function StyledSelect(props: StyledSelectProps): ReactNode;
