import { LinePath as VisxLinePath } from '@visx/shape';
export function LinePath(label) {
  return `sparkline:${VisxLinePath(label)}`;
}
