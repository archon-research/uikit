import { Laptop, Moon, Sun } from 'lucide-react';

import { useTheme, type ThemeMode } from '../theme/useTheme';

export type ThemeToggleVariant = 'segmented' | 'icon';
export type ThemeToggleAppearance = 'chip' | 'bare';

export type ThemeToggleProps = {
  /**
   * `segmented` (default) renders the 3-option radiogroup. `icon` renders a
   * single compact button that cycles auto -> light -> dark.
   */
  variant?: ThemeToggleVariant;
  /**
   * Chrome for the `icon` variant. `chip` (default) is the bordered, filled
   * chip; `bare` drops border/background/radius so the button inherits an
   * enclosing toolbar or pill surface. Ignored by the `segmented` variant.
   */
  appearance?: ThemeToggleAppearance;
  className?: string;
};

/**
 * Class names emitted by the `themeToggle` slot recipe (registered in the
 * preset + staticCss). The design-system package builds with `tsc` and ships no
 * generated `styled-system`, so styling is applied by stable Panda slot class
 * names. Conventions: slot base = `${className}__${slot}`; a variant on a slot =
 * `${className}__${slot}--${key}_${value}`. The active segment is keyed off the
 * runtime `data-active` attribute (not a variant class). A consumer `className`
 * composed LAST on `root` (utilities layer) overrides recipe styles.
 */
const slots = {
  root: 'themeToggle__root',
  option: 'themeToggle__option',
  input: 'themeToggle__input',
  iconButton: 'themeToggle__iconButton',
} as const;

const cx = (...classes: Array<string | false | null | undefined>): string =>
  classes.filter(Boolean).join(' ');

const MODES: Array<{ mode: ThemeMode; label: string }> = [
  { mode: 'auto', label: 'Auto' },
  { mode: 'light', label: 'Light' },
  { mode: 'dark', label: 'Dark' },
];

const CYCLE_ORDER: ThemeMode[] = ['auto', 'light', 'dark'];

function nextMode(mode: ThemeMode): ThemeMode {
  const index = CYCLE_ORDER.indexOf(mode);
  return CYCLE_ORDER[(index + 1) % CYCLE_ORDER.length] ?? 'auto';
}

function ThemeIcon({ mode }: { mode: ThemeMode }) {
  const iconProps = {
    'aria-hidden': true,
    size: 14,
    strokeWidth: 1.75,
    absoluteStrokeWidth: true,
  };

  switch (mode) {
    case 'auto':
      return <Laptop {...iconProps} />;
    case 'light':
      return <Sun {...iconProps} />;
    default:
      return <Moon {...iconProps} />;
  }
}

export function ThemeToggle({
  variant = 'segmented',
  appearance = 'chip',
  className,
}: ThemeToggleProps = {}) {
  const { mode, setMode } = useTheme();

  if (variant === 'icon') {
    const upcoming = nextMode(mode);
    const upcomingLabel =
      MODES.find((item) => item.mode === upcoming)?.label ?? upcoming;

    return (
      <button
        type="button"
        className={cx(
          slots.root,
          `${slots.root}--variant_icon`,
          slots.iconButton,
          // `chip` is the base iconButton look and emits no class; only `bare`
          // carries a variant class.
          appearance === 'bare' && `${slots.iconButton}--appearance_bare`,
          className,
        )}
        data-appearance={appearance}
        aria-label={`Theme: ${mode}. Switch to ${upcomingLabel}.`}
        title={`Theme: ${mode}`}
        data-scope="theme-toggle"
        data-part="icon-button"
        data-mode={mode}
        onClick={() => setMode(upcoming)}
      >
        <ThemeIcon mode={mode} />
      </button>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="Theme mode"
      className={cx(slots.root, `${slots.root}--variant_segmented`, className)}
      data-scope="theme-toggle"
      data-part="root"
    >
      {MODES.map((item) => {
        const active = mode === item.mode;
        return (
          <label
            key={item.mode}
            className={slots.option}
            data-part="option"
            data-active={active ? '' : undefined}
          >
            <input
              type="radio"
              name="theme-mode"
              aria-label={item.label}
              checked={active}
              onChange={() => setMode(item.mode)}
              className={slots.input}
            />
            <ThemeIcon mode={item.mode} />
            {item.label}
          </label>
        );
      })}
    </div>
  );
}
