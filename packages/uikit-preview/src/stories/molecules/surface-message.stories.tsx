import {
  Button,
  SurfaceMessageActions,
  SurfaceMessageBody,
  SurfaceMessageRoot,
  SurfaceMessageTitle,
  type SurfaceMessageTone,
} from '@archon-research/design-system';
import type { ReactNode } from 'react';

import { css } from '../../../styled-system/css';
import { surfaceMessage } from '../../../styled-system/recipes';

export default {
  title: 'Molecules/Surface Message',
};

const stackClassName = css({
  display: 'grid',
  gap: '4',
  p: '6',
  maxWidth: '2xl',
  fontFamily: 'sans',
});

type StoryMessageProps = {
  title: string;
  body: string;
  tone?: SurfaceMessageTone;
  actions?: ReactNode;
};

const renderMessage = ({
  title,
  body,
  tone = 'default',
  actions,
}: StoryMessageProps) => {
  const classes = surfaceMessage({ tone });

  return (
    <SurfaceMessageRoot tone={tone} className={classes.root}>
      <SurfaceMessageTitle className={classes.title}>
        {title}
      </SurfaceMessageTitle>
      <SurfaceMessageBody className={classes.body}>{body}</SurfaceMessageBody>
      {actions ? (
        <SurfaceMessageActions className={classes.actions}>
          {actions}
        </SurfaceMessageActions>
      ) : null}
    </SurfaceMessageRoot>
  );
};

export const Default = () => (
  <div className={stackClassName}>
    {renderMessage({
      title: 'No releases found',
      body: 'Create your first release to begin tracking deployment state.',
    })}
  </div>
);

export const Muted = () => (
  <div className={stackClassName}>
    {renderMessage({
      title: 'No recent activity',
      body: 'Events will appear here once collaborators start updating the project.',
      tone: 'muted',
    })}
  </div>
);

export const DashedWithActions = () => (
  <div className={stackClassName}>
    {renderMessage({
      title: 'Connect a deployment target',
      body: 'Link an environment to stream preview statuses and logs into this panel.',
      tone: 'dashed',
      actions: (
        <>
          <Button variant="panel">Add target</Button>
          <Button variant="panel">Learn more</Button>
        </>
      ),
    })}
  </div>
);
