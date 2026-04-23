import { readFileSync } from 'node:fs';

const backLinkSnippet = readFileSync(new URL('../static/back-link-snippet.html', import.meta.url), 'utf8');

export default {
  appendToHead: backLinkSnippet,
};
