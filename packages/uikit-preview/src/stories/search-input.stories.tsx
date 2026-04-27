import { useState } from 'react';

import { SearchInput } from '@archon-research/design-system';

import { css } from '../../styled-system/css';

export default {
  title: 'Components/Search Input',
};

const stackClassName = css({
  display: 'grid',
  gap: '6',
  p: '6',
  maxWidth: 'md',
  fontFamily: 'sans',
});

const fieldClassName = css({
  display: 'grid',
  gap: '2',
});

const labelClassName = css({
  color: 'text.muted',
  fontSize: 'sm',
  fontWeight: 'medium',
  lineHeight: '1.4',
});

const countryOptions = [
  'United States',
  'Canada',
  'Mexico',
  'United Kingdom',
  'France',
  'Germany',
  'Japan',
  'Australia',
];

export const Default = () => {
  const [value, setValue] = useState('');

  return (
    <div className={stackClassName}>
      <div className={fieldClassName}>
        <label className={labelClassName} htmlFor="search-default">
          Search countries
        </label>
        <SearchInput
          id="search-default"
          placeholder="Start typing..."
          value={value}
          onValueChange={setValue}
          options={countryOptions}
        />
      </div>
    </div>
  );
};

export const WithObjectOptions = () => {
  const [value, setValue] = useState('');

  const options = [
    { value: 'us', label: 'United States' },
    { value: 'ca', label: 'Canada' },
    { value: 'mx', label: 'Mexico' },
    { value: 'uk', label: 'United Kingdom' },
  ];

  return (
    <div className={stackClassName}>
      <div className={fieldClassName}>
        <label className={labelClassName} htmlFor="search-objects">
          Select with values
        </label>
        <SearchInput
          id="search-objects"
          placeholder="Search..."
          value={value}
          onValueChange={setValue}
          options={options}
          onSelectOption={(option) => console.log('Selected:', option)}
        />
      </div>
    </div>
  );
};

export const Disabled = () => (
  <div className={stackClassName}>
    <div className={fieldClassName}>
      <label className={labelClassName} htmlFor="search-disabled">
        Disabled search
      </label>
      <SearchInput
        id="search-disabled"
        placeholder="Cannot search..."
        disabled
        options={countryOptions}
      />
    </div>
  </div>
);

export const Loading = () => {
  const [value, setValue] = useState('');

  return (
    <div className={stackClassName}>
      <div className={fieldClassName}>
        <label className={labelClassName} htmlFor="search-loading">
          Search (loading state)
        </label>
        <SearchInput
          id="search-loading"
          placeholder="Loading results..."
          value={value}
          onValueChange={setValue}
          options={countryOptions}
          loading
        />
      </div>
    </div>
  );
};
