import { type HTMLAttributes } from 'react';

/**
 * Class names emitted by the `code` recipe (registered in the preset +
 * staticCss). The design-system package builds with `tsc` and ships no
 * generated `styled-system`, so styling is applied by stable Panda class
 * names: base = `code`, a variant = `code--${key}_${value}`. The nested
 * `<code>` inside `CodeBlock` is reset to inherit by the block variant's
 * `& code` selector, so it needs no class of its own.
 */
const cx = (...classes: Array<string | false | null | undefined>): string =>
  classes.filter(Boolean).join(' ');

export type CodeProps = HTMLAttributes<HTMLElement>;
export type CodeBlockProps = HTMLAttributes<HTMLPreElement>;

/** Inline `<code>` styled via the `code` recipe (`inline` variant). */
export function Code({ className, children, ...rest }: CodeProps) {
  return (
    <code
      {...rest}
      className={cx('code', 'code--variant_inline', className)}
      data-scope="code"
      data-part="inline"
    >
      {children}
    </code>
  );
}

/** Block `<pre><code>` styled via the `code` recipe (`block` variant). */
export function CodeBlock({ className, children, ...rest }: CodeBlockProps) {
  return (
    <pre
      {...rest}
      className={cx('code', 'code--variant_block', className)}
      data-scope="code"
      data-part="block"
    >
      <code>{children}</code>
    </pre>
  );
}
