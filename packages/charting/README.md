# @archon-research/charting

Token-aware chart primitives for UIKit consumer applications.

## Included primitives

- `ChartContainer`
- `LineChart`
- `BarChart`
- `Sparkline`

## Usage

```tsx
import { ChartContainer, LineChart } from '@archon-research/charting';

const data = [
  { label: 'Mon', value: 12 },
  { label: 'Tue', value: 18 },
  { label: 'Wed', value: 15 },
];

export function Example() {
  return (
    <ChartContainer title="Weekly Trend">
      <LineChart data={data} />
    </ChartContainer>
  );
}
```

## Notes

- Uses semantic CSS variable tokens (for example `--colors-text-interactive`) so it stays aligned with the active theme.
- For iconography, use `lucide-react` only.
