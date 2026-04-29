import { Autocomplete } from '@base-ui/react';
import {
  type CSSProperties,
  type InputHTMLAttributes,
  useMemo,
  useState,
} from 'react';

export type SearchInputOption =
  | string
  | {
      value: string;
      label: string;
    };

type NormalizedOption = {
  value: string;
  label: string;
};

type SearchInputProps = Omit<
  InputHTMLAttributes<HTMLInputElement>,
  'value' | 'defaultValue' | 'onChange' | 'autoComplete'
> & {
  value?: string;
  defaultValue?: string;
  onValueChange?: (value: string) => void;
  options?: readonly SearchInputOption[];
  autoComplete?: boolean;
  onSelectOption?: (option: NormalizedOption) => void;
  emptyMessage?: string;
  loading?: boolean;
};

const wrapperStyle: CSSProperties = {
  position: 'relative',
  width: '100%',
};

const inputStyle: CSSProperties = {
  width: '100%',
  minWidth: 0,
  height: 36,
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: 'var(--colors-border-subtle, #d0d5dd)',
  borderRadius: 8,
  paddingLeft: 34,
  paddingRight: 12,
  background: 'var(--colors-surface-default, #ffffff)',
  color: 'var(--colors-text-default, #111827)',
  fontSize: 14,
  lineHeight: 1.4,
  fontFamily: 'inherit',
  outline: 'none',
};

const disabledInputStyle: CSSProperties = {
  opacity: 0.65,
  cursor: 'not-allowed',
};

const iconStyle: CSSProperties = {
  position: 'absolute',
  top: '50%',
  left: 10,
  width: 16,
  height: 16,
  transform: 'translateY(-50%)',
  color: 'var(--colors-text-muted, #667085)',
  pointerEvents: 'none',
};

const popupStyle: CSSProperties = {
  marginTop: 6,
  minWidth: 'var(--anchor-width)',
  maxHeight: 280,
  overflowY: 'auto',
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: 'var(--colors-border-subtle, #d0d5dd)',
  borderRadius: 10,
  background: 'var(--colors-surface-default, #ffffff)',
  boxShadow: '0 10px 24px rgba(16, 24, 40, 0.14)',
  padding: 4,
  zIndex: 60,
};

const itemStyle: CSSProperties = {
  borderRadius: 8,
  padding: '8px 10px',
  fontSize: 14,
  lineHeight: 1.3,
  color: 'var(--colors-text-default, #111827)',
  cursor: 'pointer',
};

const statusStyle: CSSProperties = {
  padding: '8px 10px',
  fontSize: 13,
  color: 'var(--colors-text-muted, #667085)',
};

function SearchIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 16 16" style={iconStyle}>
      <circle
        cx="7"
        cy="7"
        r="4.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M10.4 10.4L14 14"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.4"
      />
    </svg>
  );
}

function normalizeOption(option: SearchInputOption): NormalizedOption {
  if (typeof option === 'string') {
    return { value: option, label: option };
  }

  return option;
}

export function SearchInput({
  value,
  defaultValue,
  onValueChange,
  options,
  autoComplete = true,
  onSelectOption,
  placeholder = 'Search',
  emptyMessage = 'No matches found.',
  loading = false,
  disabled,
  className,
  ...inputProps
}: SearchInputProps) {
  const [internalValue, setInternalValue] = useState(defaultValue ?? '');
  const normalizedOptions = useMemo(
    () => (options ?? []).map(normalizeOption),
    [options],
  );
  const currentValue = value ?? internalValue;
  const supportsAutocomplete = autoComplete && normalizedOptions.length > 0;

  const handleValueChange = (nextValue: string) => {
    if (value === undefined) {
      setInternalValue(nextValue);
    }
    onValueChange?.(nextValue);
  };

  if (!supportsAutocomplete) {
    return (
      <div className={className} style={wrapperStyle}>
        <SearchIcon />
        <input
          {...inputProps}
          type="text"
          value={currentValue}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(event) => handleValueChange(event.target.value)}
          style={disabled ? { ...inputStyle, ...disabledInputStyle } : inputStyle}
        />
      </div>
    );
  }

  return (
    <Autocomplete.Root
      items={normalizedOptions}
      value={currentValue}
      mode="list"
      autoHighlight="always"
      openOnInputClick
      itemToStringValue={(item) => (item as NormalizedOption).label}
      onValueChange={handleValueChange}
    >
      <Autocomplete.InputGroup className={className} style={wrapperStyle}>
        <SearchIcon />
        <Autocomplete.Input
          {...inputProps}
          disabled={disabled}
          placeholder={placeholder}
          style={disabled ? { ...inputStyle, ...disabledInputStyle } : inputStyle}
        />
      </Autocomplete.InputGroup>

      <Autocomplete.Portal>
        <Autocomplete.Positioner>
          <Autocomplete.Popup style={popupStyle}>
            {loading ? (
              <Autocomplete.Status style={statusStyle}>
                Loading suggestions...
              </Autocomplete.Status>
            ) : null}

            <Autocomplete.Empty style={statusStyle}>
              {emptyMessage}
            </Autocomplete.Empty>

            <Autocomplete.List>
              {(item) => {
                const option = item as NormalizedOption;

                return (
                  <Autocomplete.Item
                    key={option.value}
                    value={option}
                    onClick={() => onSelectOption?.(option)}
                    style={itemStyle}
                  >
                    {option.label}
                  </Autocomplete.Item>
                );
              }}
            </Autocomplete.List>
          </Autocomplete.Popup>
        </Autocomplete.Positioner>
      </Autocomplete.Portal>
    </Autocomplete.Root>
  );
}
