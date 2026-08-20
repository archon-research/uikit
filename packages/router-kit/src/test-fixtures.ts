import { parseSearchWith, stringifySearchWith } from '@tanstack/react-router';
import { z } from 'zod';

import { oneOfParam, textParam } from './search-params.js';

/**
 * Every param these fixtures use is plain text, so the default JSON round trip
 * would write `?rows=1` as `?rows=%221%22` — a shape no real link uses. Matching
 * a real app's config here is what makes the settle assertions meaningful.
 */
export const parseSearch = parseSearchWith((value: string) => value);
export const stringifySearch = stringifySearchWith(JSON.stringify);

export const TABS = ['overview', 'detail'] as const;

export const sharedSearchSchema = z.object({
  q: textParam(),
  tab: oneOfParam(TABS),
  item: textParam(),
});

/**
 * Values a URL can present to a param parser, spanning everything the query
 * decoder produces (coerced numbers and booleans, the empty string, an array
 * from a repeated key) plus the spellings it deliberately leaves alone.
 */
export const SEARCH_VALUE_CORPUS: readonly unknown[] = [
  undefined,
  null,
  '',
  ' ',
  '  padded  ',
  'overview',
  'detail',
  'DETAIL',
  'unknown',
  'null',
  'undefined',
  'NaN',
  'Infinity',
  '0001',
  '1e5',
  '-0',
  '1',
  '0',
  'true',
  'false',
  0,
  1,
  -1,
  1.5,
  Number.NaN,
  Number.POSITIVE_INFINITY,
  true,
  false,
  ['a', 'b'],
  [],
  {},
  { nested: true },
  () => 'ignored',
  Symbol('ignored'),
  10n,
];
