import { Field } from '@ark-ui/react/field';
import type { ComponentPropsWithoutRef, ReactNode } from 'react';

/**
 * Class names emitted by the `input` slot recipe (registered in the preset).
 * The design-system package builds with `tsc` and ships no generated
 * `styled-system`, so it cannot import `css()`/recipe fns; instead the recipe
 * is applied by its stable slot class names (Panda convention: `${className}__${slot}`).
 * The recipe must be added to `staticCss` so these classes are always generated.
 */
const slots = {
  root: 'input__root',
  label: 'input__label',
  requiredIndicator: 'input__requiredIndicator',
  control: 'input__control',
  helperText: 'input__helperText',
  errorText: 'input__errorText',
} as const;

const cx = (...classes: Array<string | false | null | undefined>): string =>
  classes.filter(Boolean).join(' ');

type FieldState = {
  required?: boolean;
  invalid?: boolean;
  disabled?: boolean;
  readOnly?: boolean;
};

type FieldFrameProps = FieldState & {
  label?: ReactNode;
  helperText?: ReactNode;
  errorText?: ReactNode;
  rootProps?: ComponentPropsWithoutRef<typeof Field.Root>;
};

function FieldFrame({
  label,
  helperText,
  errorText,
  required,
  invalid,
  disabled,
  readOnly,
  rootProps,
  children,
}: FieldFrameProps & { children: ReactNode }) {
  return (
    <Field.Root
      {...rootProps}
      className={cx(slots.root, rootProps?.className)}
      required={required}
      invalid={invalid}
      disabled={disabled}
      readOnly={readOnly}
    >
      {label ? (
        <Field.Label className={slots.label}>
          {label}
          <Field.RequiredIndicator className={slots.requiredIndicator}>
            *
          </Field.RequiredIndicator>
        </Field.Label>
      ) : null}
      {children}
      {helperText ? (
        <Field.HelperText className={slots.helperText}>
          {helperText}
        </Field.HelperText>
      ) : null}
      {errorText ? (
        <Field.ErrorText className={slots.errorText}>
          {errorText}
        </Field.ErrorText>
      ) : null}
    </Field.Root>
  );
}

export type TextInputProps = Omit<
  ComponentPropsWithoutRef<typeof Field.Input>,
  'className'
> &
  FieldFrameProps & {
    className?: string;
  };

export function TextInput({
  label,
  helperText,
  errorText,
  required,
  invalid,
  disabled,
  readOnly,
  rootProps,
  className,
  ...inputProps
}: TextInputProps) {
  return (
    <FieldFrame
      label={label}
      helperText={helperText}
      errorText={errorText}
      required={required}
      invalid={invalid}
      disabled={disabled}
      readOnly={readOnly}
      rootProps={rootProps}
    >
      <Field.Input {...inputProps} className={cx(slots.control, className)} />
    </FieldFrame>
  );
}

export type TextareaProps = Omit<
  ComponentPropsWithoutRef<typeof Field.Textarea>,
  'className'
> &
  FieldFrameProps & {
    className?: string;
  };

export function Textarea({
  label,
  helperText,
  errorText,
  required,
  invalid,
  disabled,
  readOnly,
  rootProps,
  className,
  ...textareaProps
}: TextareaProps) {
  return (
    <FieldFrame
      label={label}
      helperText={helperText}
      errorText={errorText}
      required={required}
      invalid={invalid}
      disabled={disabled}
      readOnly={readOnly}
      rootProps={rootProps}
    >
      <Field.Textarea
        {...textareaProps}
        className={cx(slots.control, className)}
      />
    </FieldFrame>
  );
}
