// Charting takes the design system as a peer dependency, so its dependency
// closure reaches back into the design system. Which group claims those
// modules is decided by priority, not by which group names them.
import { AppShell } from '@archon-research/design-system';
import { XYChart as VisxXYChart } from '@visx/xychart';
export function XYChart(label) {
  return `chart:${VisxXYChart(label)}:${AppShell(label)}`;
}
