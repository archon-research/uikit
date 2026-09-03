import { defineSlotRecipe } from '@pandacss/dev';

export const inputRecipe = defineSlotRecipe({
  className: 'input',
  description:
    'Text field contract (input + textarea) factored from SearchInput: tokenized border, focus ring, invalid/disabled states, plus label/helper/error slots.',
  slots: [
    'root',
    'label',
    'requiredIndicator',
    'control',
    'helperText',
    'errorText',
  ],
  base: {
    root: {
      display: 'flex',
      flexDirection: 'column',
      gap: '1.5',
      width: 'full',
    },
    label: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '1',
      m: '0',
      textStyle: 'bodySm',
      fontWeight: 'medium',
      color: 'text.default',
      '&[data-disabled]': {
        color: 'text.muted',
      },
    },
    requiredIndicator: {
      color: 'text.critical',
      lineHeight: '1',
    },
    control: {
      width: 'full',
      minWidth: '0',
      borderWidth: 'hairline',
      borderStyle: 'solid',
      borderColor: 'border.subtle',
      borderRadius: 'md',
      bg: 'surface.default',
      color: 'text.default',
      px: '3',
      fontFamily: 'inherit',
      textStyle: 'bodySm',
      outline: 'none',
      transitionDuration: 'fast',
      transitionProperty: 'border-color, box-shadow',
      transitionTimingFunction: 'out',
      '&::placeholder': {
        color: 'text.muted',
      },
      _hover: {
        borderColor: 'border.default',
      },
      _focusVisible: {
        borderColor: 'border.strong',
        outlineWidth: '2px',
        outlineStyle: 'solid',
        outlineColor: 'border.strong',
        outlineOffset: '1px',
      },
      '&[data-invalid], &[aria-invalid="true"]': {
        borderColor: 'text.critical',
      },
      '&:disabled, &[data-disabled]': {
        opacity: '0.65',
        cursor: 'not-allowed',
      },
      '&:is(input)': {
        h: '9',
      },
      '&:is(textarea)': {
        minH: '20',
        py: '2',
        resize: 'vertical',
        lineHeight: 'relaxed',
      },
    },
    helperText: {
      m: '0',
      textStyle: 'bodySm',
      color: 'text.muted',
    },
    errorText: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '1',
      m: '0',
      textStyle: 'bodySm',
      color: 'text.critical',
    },
  },
});
