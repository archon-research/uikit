import { createElement } from 'react';
export function render(node) {
  return createElement('div', { node });
}
