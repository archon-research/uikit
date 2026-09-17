// A second lazy route on a different charting subpath. Nothing it needs comes
// from `@visx/xychart`, so nothing it needs should wait on it.
import { LinePath } from '@archon-research/charting/primitives';

globalThis.sparklineRoute = () => LinePath('lazy');
