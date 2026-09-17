import { useState } from 'react';
export function Dialog(label) {
  const [state] = useState(label);
  return `dialog:${state}`;
}
