import { scheduleWork } from 'scheduler';
import { render } from './index.js';
export function createRoot(container) {
  return { render: (tree) => scheduleWork(() => render([container, tree])) };
}
