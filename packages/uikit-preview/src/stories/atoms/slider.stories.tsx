import { Slider } from '@archon-research/design-system';

import { css } from '../../../styled-system/css';

export default {
  title: 'Atoms/Slider',
};

const frameClassName = css({
  display: 'grid',
  gap: '6',
  maxWidth: 'md',
  p: '6',
  fontFamily: 'sans',
});

const labelClassName = css({
  color: 'text.muted',
  fontSize: 'sm',
  fontWeight: 'medium',
  lineHeight: '1.4',
  mb: '2',
});

const controlClassName = css({
  alignItems: 'center',
  display: 'flex',
  height: '8',
  position: 'relative',
});

const trackClassName = css({
  background: 'surface.muted',
  borderRadius: 'full',
  height: '2',
  position: 'relative',
  width: 'full',
});

const rangeClassName = css({
  background: 'fg.default',
  borderRadius: 'full',
  height: 'full',
  position: 'absolute',
});

const thumbClassName = css({
  background: 'surface.default',
  borderColor: 'border.default',
  borderRadius: 'full',
  borderWidth: '1px',
  boxShadow: 'sm',
  height: '4',
  width: '4',
});

const valueClassName = css({
  color: 'text.default',
  fontSize: 'sm',
  mt: '2',
});

export const SingleThumb = () => (
  <div className={frameClassName}>
    <div>
      <p className={labelClassName}>Volume</p>
      <Slider.Root defaultValue={[35]} max={100} min={0}>
        <Slider.Control className={controlClassName}>
          <Slider.Track className={trackClassName}>
            <Slider.Range className={rangeClassName} />
          </Slider.Track>
          <Slider.Thumb className={thumbClassName} index={0} />
        </Slider.Control>
      </Slider.Root>
      <p className={valueClassName}>Default: 35%</p>
    </div>
  </div>
);

export const Range = () => (
  <div className={frameClassName}>
    <div>
      <p className={labelClassName}>Selected window</p>
      <Slider.Root defaultValue={[20, 70]} max={100} min={0}>
        <Slider.Control className={controlClassName}>
          <Slider.Track className={trackClassName}>
            <Slider.Range className={rangeClassName} />
          </Slider.Track>
          <Slider.Thumb className={thumbClassName} index={0} />
          <Slider.Thumb className={thumbClassName} index={1} />
        </Slider.Control>
      </Slider.Root>
      <p className={valueClassName}>Default: 20% - 70%</p>
    </div>
  </div>
);
