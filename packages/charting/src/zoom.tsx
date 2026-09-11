import { scaleLinear } from '@visx/scale';
import { Zoom } from '@visx/zoom';
import { useEffect, useMemo, type ReactNode } from 'react';

export type ZoomDomain = [number, number];

/** The subset of `@visx/zoom`'s render-prop object this overlay relies on. */
type ZoomRenderProps = {
  transformMatrix: { scaleX: number; translateX: number };
  isDragging: boolean;
  handleWheel: (event: React.WheelEvent<SVGRectElement>) => void;
  dragStart: (
    event: React.MouseEvent<SVGRectElement> | React.TouchEvent<SVGRectElement>,
  ) => void;
  dragMove: (
    event: React.MouseEvent<SVGRectElement> | React.TouchEvent<SVGRectElement>,
  ) => void;
  dragEnd: () => void;
  reset: () => void;
};

export type ZoomPanOverlayProps = {
  width: number;
  height: number;
  /** Full numeric domain (epoch ms or index) that zoom/pan are constrained to. */
  domain: ZoomDomain;
  /** Called with the new visible window whenever the user zooms or pans. */
  onDomainChange: (window: ZoomDomain) => void;
  /** Maximum zoom-in factor. Default 20x. */
  maxScale?: number;
  /** Content to render under the interaction layer, e.g. the `<XYChart>`. */
  children?: ReactNode;
};

/**
 * Zooms the x axis only, leaving `scaleY` at exactly 1.
 *
 * Not a preference — a requirement of pinning `scaleYMin`/`scaleYMax` to 1.
 * visx's default wheel handler scales both axes, and its constraint check is
 * all-or-nothing: a matrix that violates EITHER bound is discarded whole and
 * the previous one kept. A default wheel event therefore proposes
 * `scaleY: 1.1`, fails the y bound, and silently drops the x zoom with it,
 * leaving the transform untouched — the overlay pans but never zooms. Only the
 * y bound can be pinned this way, because the y transform is what has to stay
 * out of the way: this overlay derives a horizontal domain window, it does not
 * transform the chart's SVG.
 *
 * The identity return for `deltaY === 0` is not a micro-optimisation. A
 * trackpad's horizontal scroll arrives as a `deltaX` with `deltaY` exactly 0
 * (or -0), and a two-branch ternary has nowhere to put "no vertical delta":
 * `-0 > 0` is false, so a sideways swipe would fall into the zoom-OUT branch
 * and step the overlay down a notch per wheel tick, all the way to
 * `scaleXMin`, emitting a new domain from `onDomainChange` each time. `0 ===
 * -0` in JS, so the one comparison covers both spellings.
 */
const horizontalWheelDelta = (event: { deltaY: number }) => ({
  scaleX: event.deltaY === 0 ? 1 : -event.deltaY > 0 ? 1.1 : 0.9,
  scaleY: 1,
});

function ZoomDomainEffect({
  zoom,
  fullScale,
  width,
  onDomainChange,
}: {
  zoom: ZoomRenderProps;
  fullScale: (value: number) => number;
  width: number;
  onDomainChange: (window: ZoomDomain) => void;
}) {
  const { scaleX, translateX } = zoom.transformMatrix;
  const invert = useMemo(() => {
    const scale = scaleLinear({ domain: [0, width], range: [0, width] });
    return (px: number) => scale.invert((px - translateX) / scaleX);
  }, [translateX, scaleX, width]);

  useEffect(() => {
    const start = fullScale(invert(0));
    const end = fullScale(invert(width));
    onDomainChange(start <= end ? [start, end] : [end, start]);
    // Re-derive only when the transform actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [scaleX, translateX]);

  return null;
}

/**
 * A transparent scroll-to-zoom + drag-to-pan overlay for time-series charts,
 * built on `@visx/zoom`. `@visx/xychart` has no built-in zoom, and `XYChart`'s
 * scales are declarative (driven by a `domain` prop), so this does not
 * transform the chart's SVG directly — it computes a new visible domain
 * window from the zoom transform matrix and hands it to `onDomainChange`. The
 * consumer re-renders `<XYChart>` with that window (for example as an
 * explicit `xScale.domain`, or by slicing the data array).
 *
 * Wheel to zoom horizontally (around the cursor), drag to pan, double-click
 * to reset.
 */
export function ZoomPanOverlay({
  width,
  height,
  domain,
  onDomainChange,
  maxScale = 20,
  children,
}: ZoomPanOverlayProps) {
  const fullScale = useMemo(
    () => scaleLinear({ domain: [0, width], range: domain }),
    [width, domain],
  );

  return (
    <Zoom<SVGRectElement>
      width={width}
      height={height}
      scaleXMin={1}
      scaleXMax={maxScale}
      scaleYMin={1}
      scaleYMax={1}
      wheelDelta={horizontalWheelDelta}
    >
      {(zoom) => (
        <div style={{ position: 'relative', width, height }}>
          {children}
          <svg
            width={width}
            height={height}
            style={{ position: 'absolute', inset: 0, touchAction: 'none' }}
          >
            <rect
              width={width}
              height={height}
              fill="transparent"
              style={{ cursor: zoom.isDragging ? 'grabbing' : 'grab' }}
              onWheel={zoom.handleWheel}
              onMouseDown={zoom.dragStart}
              onMouseMove={zoom.dragMove}
              onMouseUp={zoom.dragEnd}
              onMouseLeave={zoom.dragEnd}
              onDoubleClick={() => zoom.reset()}
            />
          </svg>
          <ZoomDomainEffect
            zoom={zoom}
            fullScale={(v) => fullScale(v) ?? v}
            width={width}
            onDomainChange={onDomainChange}
          />
        </div>
      )}
    </Zoom>
  );
}
