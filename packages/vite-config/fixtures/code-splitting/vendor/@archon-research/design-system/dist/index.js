import { useState } from 'react';
export function AppShell(label) {
  const [state] = useState(label);
  return `shell:${state}`;
}
