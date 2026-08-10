import { Combobox, useListCollection } from '@ark-ui/react/combobox';
import { Search } from 'lucide-react';
import { type InputHTMLAttributes, useEffect, useMemo, useState } from 'react';

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

/**
 * Class names emitted by the `searchInput` slot recipe (registered in the
 * preset + staticCss). The design-system package builds with `tsc` and ships no
 * generated `styled-system`, so styling is applied by stable Panda slot class
 * names (`${className}__${slot}`). Disabled state is handled by the recipe's
 * `&:disabled` selector, so no inline style merge is needed. A consumer
 * `className` composed LAST on `root` (utilities layer) overrides recipe styles
 *.
 */
const slots = {
  root: 'searchInput__root',
  icon: 'searchInput__icon',
  control: 'searchInput__control',
  popup: 'searchInput__popup',
  item: 'searchInput__item',
  status: 'searchInput__status',
} as const;

const cx = (...classes: Array<string | false | null | undefined>): string =>
  classes.filter(Boolean).join(' ');

function SearchIcon() {
  return (
    <Search
      aria-hidden="true"
      className={slots.icon}
      size={16}
      strokeWidth={3}
      absoluteStrokeWidth
    />
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
      <div
        className={cx(slots.root, className)}
        data-scope="search-input"
        data-part="root"
      >
        <SearchIcon />
        <input
          {...inputProps}
          type="text"
          value={currentValue}
          disabled={disabled}
          placeholder={placeholder}
          onChange={(event) => handleValueChange(event.target.value)}
          className={slots.control}
          data-part="control"
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
      <Combobox.Control className={cx(slots.root, className)} data-part="root">
        <SearchIcon />
        <Combobox.Input
          {...inputProps}
          disabled={disabled}
          placeholder={placeholder}
          className={slots.control}
          data-part="control"
        />
      </Combobox.Control>

      <Combobox.Positioner>
        <Combobox.Content className={slots.popup} data-part="popup">
          {loading ? (
            <div className={slots.status}>Loading suggestions...</div>
          ) : null}

          <Combobox.Empty className={slots.status}>
            {emptyMessage}
          </Combobox.Empty>

          <Combobox.List>
            {collection.items.map((option) => (
              <Combobox.Item
                key={option.value}
                item={option}
                className={slots.item}
                data-part="item"
              >
                <Combobox.ItemText>{option.label}</Combobox.ItemText>
              </Combobox.Item>
            ))}
          </Combobox.List>
        </Combobox.Content>
      </Combobox.Positioner>
    </Combobox.Root>
  );
}
