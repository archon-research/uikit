import { SurfaceMessage } from '@archon-research/design-system';

import '../../styled-system/styles.css';
import { css } from '../../styled-system/css';

export default {
  title: 'Components/Surface Message',
};

const stackClassName = css({
  display: 'grid',
  gap: '4',
  p: '6',
  maxWidth: '2xl',
  fontFamily: 'sans',
});

const actionsClassName = css({
  display: 'flex',
  gap: '2',
  mt: '3',
});

const actionButtonClassName = css({
  px: '3',
  py: '2',
  borderRadius: 'sm',
  borderColor: 'border.subtle',
  borderStyle: 'solid',
  borderWidth: '1px',
  bg: 'surface.default',
  color: 'text.default',
  fontSize: 'sm',
  lineHeight: '1',
});

export const Default = () => (
  <div className={stackClassName}>
    <SurfaceMessage
      title="No releases found"
      body="Create your first release to begin tracking deployment state."
    />
  </div>
);

export const Muted = () => (
  <div className={stackClassName}>
    <SurfaceMessage
      title="No recent activity"
      body="Events will appear here once collaborators start updating the project."
      tone="muted"
    />
  </div>
);

export const DashedWithActions = () => (
  <div className={stackClassName}>
    <SurfaceMessage
      title="Connect a deployment target"
      body="Link an environment to stream preview statuses and logs into this panel."
      tone="dashed"
    >
      <div className={actionsClassName}>
        <button className={actionButtonClassName} type="button">
          Add target
        </button>
        <button className={actionButtonClassName} type="button">
          Learn more
        </button>
      </div>
    </SurfaceMessage>
  </div>
);
