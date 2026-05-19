import type { ReactNode, SelectHTMLAttributes } from 'react';

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  children: ReactNode;
  className?: string;
};

/** @deprecated Use SelectProps instead. */
export type StyledSelectProps = SelectProps;

export declare function Select(props: SelectProps): ReactNode;

/** @deprecated Use Select instead. */
export declare const StyledSelect: typeof Select;
