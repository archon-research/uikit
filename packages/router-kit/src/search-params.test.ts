import { describe, expect, it } from 'vitest';

import {
  oneOfParam,
  textParam,
  toSearchOption,
  toSearchText,
} from './search-params.js';
import {
  jsonParseSearch,
  jsonStringifySearch,
  parseSearch,
  SEARCH_VALUE_CORPUS,
  stringifySearch,
  TABS,
} from './test-fixtures.js';

/**
 * Renders a normalized value into a query string and decodes it back through
 * the router's own parser, so the idempotence claims below are checked against
 * the real decoder rather than a restatement of what it is believed to do.
 *
 * Two grammars, because the amount of coercion depends on which one the router
 * was built with: the identity parser stops after the qss decode, the default
 * one JSON-parses on top of it.
 */
function throughUrl(value: string | undefined): unknown {
  const query = stringifySearch(value === undefined ? {} : { k: value });
  return (parseSearch(query) as Record<string, unknown>).k;
}

function throughJsonUrl(value: string | undefined): unknown {
  const query = jsonStringifySearch(value === undefined ? {} : { k: value });
  return (jsonParseSearch(query) as Record<string, unknown>).k;
}

function decodeUrl(query: string): unknown {
  return (parseSearch(query) as Record<string, unknown>).k;
}

function decodeJsonUrl(query: string): unknown {
  return (jsonParseSearch(query) as Record<string, unknown>).k;
}

describe('toSearchText — the decoder shapes it exists to absorb', () => {
  it.each([
    // The coercions a parser written against `string` would not survive.
    { url: '?k=25', decoded: 25, text: '25' },
    { url: '?k=true', decoded: true, text: 'true' },
    { url: '?k=false', decoded: false, text: 'false' },
    { url: '?k=0', decoded: 0, text: '0' },
    // Present-but-empty, in both spellings, means absent.
    { url: '?k=', decoded: '', text: undefined },
    { url: '?k', decoded: '', text: undefined },
    // A repeated key decodes to an array, which is no usable single value.
    { url: '?k=a&k=b', decoded: ['a', 'b'], text: undefined },
    // Text that is not a number's canonical spelling is left alone, which is
    // what keeps the round trip below lossless.
    { url: '?k=0001', decoded: '0001', text: '0001' },
    { url: '?k=1e5', decoded: '1e5', text: '1e5' },
    { url: '?k=-0', decoded: '-0', text: '-0' },
    { url: '?k=Infinity', decoded: 'Infinity', text: 'Infinity' },
    { url: '?k=NaN', decoded: 'NaN', text: 'NaN' },
    { url: '?k=null', decoded: 'null', text: 'null' },
    // Surrounding whitespace survives the URL and is trimmed here.
    { url: '?k=%20padded%20', decoded: ' padded ', text: 'padded' },
  ])('$url decodes to $decoded and normalizes to $text', (testCase) => {
    expect(decodeUrl(testCase.url)).toEqual(testCase.decoded);
    expect(toSearchText(decodeUrl(testCase.url))).toBe(testCase.text);
  });
});

describe('toSearchText — the totality contract', () => {
  it.each(SEARCH_VALUE_CORPUS.map((value) => ({ value })))(
    'answers with text or absence for %o',
    ({ value }) => {
      const text = toSearchText(value);

      expect(text === undefined || typeof text === 'string').toBe(true);
      expect(text).not.toBe('');
    },
  );

  it('never rejects, so validateSearch cannot fail a route on a bad param', () => {
    const schema = textParam();

    for (const value of SEARCH_VALUE_CORPUS) {
      expect(() => schema.parse(value)).not.toThrow();
    }
  });
});

describe('toSearchText — the idempotence contract', () => {
  it.each(SEARCH_VALUE_CORPUS.map((value) => ({ value })))(
    'survives a render-and-redecode round trip for %o',
    ({ value }) => {
      const once = toSearchText(value);

      expect(toSearchText(throughUrl(once))).toBe(once);
    },
  );

  // The contract has to hold under the router's *default* grammar too, which
  // JSON-parses on top of the qss decode and so coerces strictly more. That is
  // the grammar an app gets by not configuring one.
  it.each(SEARCH_VALUE_CORPUS.map((value) => ({ value })))(
    'survives the round trip under the default JSON grammar for %o',
    ({ value }) => {
      const once = toSearchText(value);

      expect(toSearchText(throughJsonUrl(once))).toBe(once);
    },
  );

  // Idempotence is not text preservation, and the gap is worth pinning: under
  // the JSON grammar these really were decoded to numbers, so the canonical URL
  // differs from the one typed — once, and then it holds.
  it.each([
    { url: '?k=1e5', identity: '1e5', json: '100000' },
    { url: '?k=-0', identity: '-0', json: '0' },
  ])('$url canonicalizes per grammar, then holds', (testCase) => {
    expect(toSearchText(decodeUrl(testCase.url))).toBe(testCase.identity);

    const jsonOnce = toSearchText(decodeJsonUrl(testCase.url));

    expect(jsonOnce).toBe(testCase.json);
    expect(toSearchText(throughJsonUrl(jsonOnce))).toBe(jsonOnce);
  });
});

describe('toSearchOption', () => {
  it.each(SEARCH_VALUE_CORPUS.map((value) => ({ value })))(
    'answers with a member of the closed set or absence for %o',
    ({ value }) => {
      const option = toSearchOption(value, TABS);

      expect(option === undefined || TABS.includes(option)).toBe(true);
    },
  );

  it('is case sensitive, so a near-miss spelling degrades to absent', () => {
    expect(toSearchOption('DETAIL', TABS)).toBeUndefined();
    expect(toSearchOption('detail', TABS)).toBe('detail');
  });

  it('narrows a coerced value against the set', () => {
    expect(toSearchOption(1, ['1', '2'] as const)).toBe('1');
    expect(toSearchOption(true, ['true'] as const)).toBe('true');
    expect(toSearchOption(3, ['1', '2'] as const)).toBeUndefined();
  });

  it.each(SEARCH_VALUE_CORPUS.map((value) => ({ value })))(
    'survives a render-and-redecode round trip for %o',
    ({ value }) => {
      const once = toSearchOption(value, TABS);

      expect(toSearchOption(throughUrl(once), TABS)).toBe(once);
    },
  );
});

describe('oneOfParam', () => {
  it('never rejects, whatever the URL carried', () => {
    const schema = oneOfParam(TABS);

    for (const value of SEARCH_VALUE_CORPUS) {
      expect(() => schema.parse(value)).not.toThrow();
    }
  });

  it('drops a value outside the set', () => {
    expect(oneOfParam(TABS).parse('unknown')).toBeUndefined();
    expect(oneOfParam(TABS).parse('overview')).toBe('overview');
  });
});
