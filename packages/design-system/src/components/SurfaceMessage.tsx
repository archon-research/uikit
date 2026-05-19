import {
  type CSSProperties,
  type HTMLAttributes,
  type ReactNode,
} from 'react';

export type SurfaceMessageTone = 'default' | 'muted' | 'dashed';

export type SurfaceMessageProps = {
  title: string;
  body: string;
  tone?: SurfaceMessageTone;
  children?: ReactNode;
};

export type SurfaceMessageRootProps = HTMLAttributes<HTMLDivElement> & {
  tone?: SurfaceMessageTone;
};

export type SurfaceMessageTitleProps = HTMLAttributes<HTMLParagraphElement>;
export type SurfaceMessageBodyProps = HTMLAttributes<HTMLParagraphElement>;
export type SurfaceMessageActionsProps = HTMLAttributes<HTMLDivElement>;

const wrapperStyle: CSSProperties = {
  borderRadius: 8,
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: 'var(--colors-border-subtle, #d0d5dd)',
  background: 'var(--colors-surface-subtle, #f8f9fb)',
  padding: 16,
};

const titleStyle: CSSProperties = {
  margin: 0,
  fontSize: 14,
  fontWeight: 600,
  color: 'var(--colors-text-strong, #111827)',
};

const bodyStyle: CSSProperties = {
  margin: 0,
  marginTop: 8,
  fontSize: 14,
  color: 'var(--colors-text-muted, #667085)',
};

function getWrapperStyle(tone: SurfaceMessageTone): CSSProperties {
  if (tone === 'dashed') {
    return { ...wrapperStyle, borderStyle: 'dashed' };
  }

  if (tone === 'muted') {
    return {
      ...wrapperStyle,
      background: 'var(--colors-surface-default, #ffffff)',
    };
  }

  return wrapperStyle;
}

export function SurfaceMessageRoot({
  tone = 'default',
  style,
  children,
  ...props
}: SurfaceMessageRootProps) {
  return (
    <div {...props} style={{ ...getWrapperStyle(tone), ...style }}>
      {children}
    </div>
  );
}

export function SurfaceMessageTitle({
  style,
  children,
  ...props
}: SurfaceMessageTitleProps) {
  return (
    <p {...props} style={{ ...titleStyle, ...style }}>
      {children}
    </p>
  );
}

export function SurfaceMessageBody({
  style,
  children,
  ...props
}: SurfaceMessageBodyProps) {
  return (
    <p {...props} style={{ ...bodyStyle, ...style }}>
      {children}
    </p>
  );
}

export function SurfaceMessageActions({
  style,
  children,
  ...props
}: SurfaceMessageActionsProps) {
  return (
    <div {...props} style={style}>
      {children}
    </div>
  );
}

export function SurfaceMessage({
  title,
  body,
  tone = 'default',
  children,
}: SurfaceMessageProps) {
  return (
    <SurfaceMessageRoot tone={tone}>
      <SurfaceMessageTitle>{title}</SurfaceMessageTitle>
      <SurfaceMessageBody>{body}</SurfaceMessageBody>
      {children}
    </SurfaceMessageRoot>
  );
}
