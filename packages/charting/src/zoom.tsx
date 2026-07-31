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
 * Wheel to zoom (around the cursor), drag to pan, double-click to reset.
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
