import { ResizeHandle } from '@archon-research/design-system';

import { css } from '../../styled-system/css';

export default {
  title: 'Components/Resize Handle',
};

const canvasClassName = css({
  position: 'relative',
  borderColor: 'border.subtle',
  borderStyle: 'solid',
  borderWidth: '1px',
  borderRadius: 'md',
  bg: 'surface.default',
});

const verticalCanvasClassName = css({
  height: '52',
  width: '80',
  p: '6',
});

const horizontalCanvasClassName = css({
  height: '40',
  width: '80',
  p: '6',
  display: 'grid',
  alignContent: 'end',
});

const titleClassName = css({
  mb: '3',
  fontFamily: 'sans',
  color: 'text.default',
  fontWeight: 'medium',
  fontSize: 'sm',
});

const stackClassName = css({
  display: 'grid',
  gap: '6',
  p: '6',
});

const noop = () => {};

export const VerticalOverlay = () => (
  <div className={stackClassName}>
    <div>
      <p className={titleClassName}>Vertical separator (overlay)</p>
      <div className={`${canvasClassName} ${verticalCanvasClassName}`}>
        <ResizeHandle axis="vertical" label="Resize sidebar" onMouseDown={noop} />
      </div>
    </div>
  </div>
);

export const HorizontalBlock = () => (
  <div className={stackClassName}>
    <div>
      <p className={titleClassName}>Horizontal separator (block)</p>
      <div className={`${canvasClassName} ${horizontalCanvasClassName}`}>
        <ResizeHandle
          axis="horizontal"
          label="Resize bottom panel"
          onMouseDown={noop}
          placement="block"
        />
      </div>
    </div>
  </div>
);

export const HorizontalOverlay = () => (
  <div className={stackClassName}>
    <div>
      <p className={titleClassName}>Horizontal separator (overlay)</p>
      <div className={`${canvasClassName} ${horizontalCanvasClassName}`}>
        <ResizeHandle
          axis="horizontal"
          label="Resize top panel"
          onMouseDown={noop}
          placement="overlay"
        />
      </div>
    </div>
  </div>
);
