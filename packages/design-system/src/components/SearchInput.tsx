import { Combobox, useListCollection } from '@ark-ui/react/combobox';
import { Search } from 'lucide-react';
import {
  type CSSProperties,
  type InputHTMLAttributes,
  useEffect,
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
  minWidth: 'var(--reference-width, var(--anchor-width))',
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
    <Search aria-hidden="true" size={16} style={iconStyle} strokeWidth={1.9} />
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
  const { collection, filter, set } = useListCollection({
    initialItems: normalizedOptions,
    itemToString: (item) => item.label,
    itemToValue: (item) => item.value,
    filter: (itemText, filterText) =>
      itemText.toLowerCase().includes(filterText.toLowerCase()),
  });

  useEffect(() => {
    set([...normalizedOptions]);

    if (currentValue) {
      filter(currentValue);
    }
  }, [currentValue, filter, normalizedOptions, set]);

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
          style={
            disabled ? { ...inputStyle, ...disabledInputStyle } : inputStyle
          }
        />
      </div>
    );
  }

  return (
    <Combobox.Root
      collection={collection}
      inputValue={currentValue}
      inputBehavior="autohighlight"
      openOnClick
      closeOnSelect
      disabled={disabled}
      selectionBehavior="replace"
      onInputValueChange={({ inputValue }) => handleValueChange(inputValue)}
      onValueChange={({ items }) => {
        const option = items[0] as NormalizedOption | undefined;

        if (option) {
          onSelectOption?.(option);
        }
      }}
    >
      <Combobox.Control className={className} style={wrapperStyle}>
        <SearchIcon />
        <Combobox.Input
          {...inputProps}
          disabled={disabled}
          placeholder={placeholder}
          style={
            disabled ? { ...inputStyle, ...disabledInputStyle } : inputStyle
          }
        />
      </Combobox.Control>

      <Combobox.Positioner>
        <Combobox.Content style={popupStyle}>
          {loading ? (
            <div style={statusStyle}>Loading suggestions...</div>
          ) : null}

          <Combobox.Empty style={statusStyle}>{emptyMessage}</Combobox.Empty>

          <Combobox.List>
            {collection.items.map((option) => (
              <Combobox.Item key={option.value} item={option} style={itemStyle}>
                <Combobox.ItemText>{option.label}</Combobox.ItemText>
              </Combobox.Item>
            ))}
          </Combobox.List>
        </Combobox.Content>
      </Combobox.Positioner>
    </Combobox.Root>
  );
}
