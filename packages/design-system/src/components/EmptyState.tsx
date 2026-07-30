import { type ReactNode } from 'react';

type EmptyStateProps = {
  title: string;
  description: string;
  icon?: ReactNode;
  action?: ReactNode;
  size?: 'default' | 'compact';
  stretch?: boolean;
  className?: string;
};

/**
 * Class names emitted by the `emptyState` slot recipe (registered in the preset
 * + staticCss). The design-system package builds with `tsc` and ships no
 * generated `styled-system`, so styling is applied by stable Panda slot class
 * names. Conventions: slot base = `${className}__${slot}`; a slot variant =
 * `${className}__${slot}--${key}_${value}`. A consumer `className` composed LAST
 * on `root` (utilities layer) overrides recipe styles.
 */
const cx = (...classes: Array<string | false | null | undefined>): string =>
  classes.filter(Boolean).join(' ');

export function EmptyState({
  title,
  description,
  icon,
  action,
  size = 'default',
  stretch = false,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cx(
        'emptyState__root',
        `emptyState__root--size_${size}`,
        `emptyState__root--stretch_${stretch}`,
        className,
      )}
      data-scope="empty-state"
      data-part="root"
      data-size={size}
      data-stretch={stretch ? '' : undefined}
    >
      <div
        className={cx('emptyState__icon', `emptyState__icon--size_${size}`)}
        data-part="icon"
      >
        {icon ?? '○'}
      </div>
      <div className="emptyState__body" data-part="body">
        <h3
          className={cx('emptyState__title', `emptyState__title--size_${size}`)}
          data-part="title"
        >
          {title}
        </h3>
        <p
          className={cx(
            'emptyState__description',
            `emptyState__description--size_${size}`,
          )}
          data-part="description"
        >
          {description}
        </p>
      </div>
      {action ? (
        <div className="emptyState__actions" data-part="actions">
          {action}
        </div>
      ) : null}
    </div>
  );
}
