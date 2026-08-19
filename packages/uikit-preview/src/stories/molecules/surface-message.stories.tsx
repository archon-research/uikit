import {
  Button,
  SurfaceMessage,
  SurfaceMessageActions,
  SurfaceMessageBody,
  SurfaceMessageRoot,
  SurfaceMessageTitle,
  type SurfaceMessageTone,
} from '@archon-research/design-system';
import type { ReactNode } from 'react';

import { css } from '../../../styled-system/css';

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

// Root-level override: a wider, squarer frame than the recipe's own.
const wideFrameClassName = css({
  borderRadius: '0',
  borderLeftWidth: '3px',
  p: '5',
});

// Slot-level override: the body reads as machine output.
const monoBodyClassName = css({
  fontFamily: 'mono',
  color: 'text.default',
});

type StoryMessageProps = {
  title: string;
  body: string;
  tone?: SurfaceMessageTone;
  actions?: ReactNode;
};

// The parts style themselves from the `surfaceMessage` recipe, so composing them
// needs no recipe call and no style props at the call site.
const renderMessage = ({
  title,
  body,
  tone = 'default',
  actions,
}: StoryMessageProps) => (
  <SurfaceMessageRoot tone={tone}>
    <SurfaceMessageTitle tone={tone}>{title}</SurfaceMessageTitle>
    <SurfaceMessageBody>{body}</SurfaceMessageBody>
    {actions ? <SurfaceMessageActions>{actions}</SurfaceMessageActions> : null}
  </SurfaceMessageRoot>
);

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

// A consumer `className` (root) and per-slot `classNames` compose on top of the
// recipe classes instead of losing to inline styles.
export const ClassNameOverrides = () => (
  <div className={stackClassName}>
    <SurfaceMessage
      title="Reconciliation lagging"
      body="The last completed run finished 42 minutes ago; downstream figures may be stale."
      tone="critical"
      className={wideFrameClassName}
      classNames={{ body: monoBodyClassName }}
    />
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
