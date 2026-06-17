import {
  type ChangeEvent,
  type CSSProperties,
  useCallback,
  useEffect,
  useId,
  useMemo,
  useRef,
  useState,
} from 'react';

import { StyledSelect } from './StyledSelect';

export type RangePreset =
  | '1h'
  | '6h'
  | '24h'
  | '7d'
  | '30d'
  | '90d'
  | '180d'
  | '365d'
  | 'custom';

// An applied range always has both endpoints; presets compute both and the
// custom flow only commits once both are present and valid (see disableConfirm).
export type TimeRange = {
  from_timestamp: string;
  to_timestamp: string;
};

// The in-progress custom range being edited in the modal, where either endpoint
// may be empty until the user fills it in. Narrowed to a TimeRange on confirm.
type DraftRange = {
  from_timestamp: string | undefined;
  to_timestamp: string | undefined;
};

export type RangePickerProps = {
  preset: RangePreset;
  range: TimeRange;
  onChange: (preset: RangePreset, range: TimeRange) => void;
};

const PRESETS: { label: string; value: RangePreset }[] = [
  { label: '1 hour', value: '1h' },
  { label: '6 hours', value: '6h' },
  { label: '24 hours', value: '24h' },
  { label: '7 days', value: '7d' },
  { label: '30 days', value: '30d' },
  { label: '90 days', value: '90d' },
  { label: '180 days', value: '180d' },
  { label: '365 days', value: '365d' },
  { label: 'Custom', value: 'custom' },
];

// Value for the option that displays the currently-applied custom range
// (e.g. "Custom (1 day)"). Distinct from 'custom', which re-opens the picker.
const CUSTOM_ACTIVE_VALUE = 'custom-active';

const rootStyle: CSSProperties = {
  display: 'grid',
  gap: 4,
};

const fieldStyle: CSSProperties = {
  display: 'grid',
  gap: 4,
};

const labelStyle: CSSProperties = {
  fontSize: 12,
  color: 'var(--colors-text-muted, #667085)',
};

const dateInputStyle: CSSProperties = {
  height: 32,
  borderRadius: 8,
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: 'var(--colors-border-subtle, #d0d5dd)',
  background: 'var(--colors-surface-default, #ffffff)',
  color: 'var(--colors-text-default, #111827)',
  padding: '0 8px',
  fontSize: 12,
  minWidth: 0,
  width: '100%',
  fontFamily: 'inherit',
};

const customDialogStyle: CSSProperties = {
  border: 'none',
  padding: 0,
  background: 'transparent',
  maxWidth: '100%',
  maxHeight: '100%',
  margin: 'auto',
};

const customModalStyle: CSSProperties = {
  width: 'min(32rem, 100%)',
  borderRadius: 12,
  borderWidth: 1,
  borderStyle: 'solid',
  borderColor: 'var(--colors-border-default, #d0d5dd)',
  background: 'var(--colors-surface-default, #ffffff)',
  boxShadow: '0 18px 48px rgba(0, 0, 0, 0.35)',
  display: 'grid',
  gap: 16,
  padding: 16,
};

const modalHeadingStyle: CSSProperties = {
  display: 'grid',
  gap: 4,
};

const modalTitleStyle: CSSProperties = {
  margin: 0,
  fontSize: 16,
  color: 'var(--colors-text-strong, #101828)',
};

const modalDescriptionStyle: CSSProperties = {
  margin: 0,
  fontSize: 14,
  color: 'var(--colors-text-muted, #667085)',
};

const modalInputsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  gap: 8,
  flexWrap: 'wrap',
};

const modalInputFieldStyle: CSSProperties = {
  minWidth: 192,
  flex: '1 1 12rem',
};

const modalActionsStyle: CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'flex-end',
  gap: 8,
  flexWrap: 'wrap',
};

function getModalActionButtonStyle(variant: 'ghost' | 'solid'): CSSProperties {
  return {
    height: 36,
    padding: '0 14px',
    borderRadius: 8,
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor:
      variant === 'solid'
        ? 'var(--colors-interactive-accent, #1d4ed8)'
        : 'var(--colors-border-default, #d0d5dd)',
    background:
      variant === 'solid'
        ? 'var(--colors-interactive-default, #155eef)'
        : 'var(--colors-surface-default, #ffffff)',
    color:
      variant === 'solid'
        ? 'var(--colors-text-inverted, #ffffff)'
        : 'var(--colors-text-default, #111827)',
    cursor: 'pointer',
    fontSize: 14,
    fontWeight: 600,
    fontFamily: 'inherit',
  };
}

export function isRangePreset(
  value: string | null | undefined,
): value is RangePreset {
  return (
    value != null &&
    PRESETS.some((presetOption) => presetOption.value === value)
  );
}

export function presetToRange(
  preset: Exclude<RangePreset, 'custom'>,
): TimeRange {
  const now = new Date();
  const dayMs = 24 * 60 * 60 * 1000;
  const offsetMs: Record<typeof preset, number> = {
    '1h': 60 * 60 * 1000,
    '6h': 6 * 60 * 60 * 1000,
    '24h': dayMs,
    '7d': 7 * dayMs,
    '30d': 30 * dayMs,
    '90d': 90 * dayMs,
    '180d': 180 * dayMs,
    '365d': 365 * dayMs,
  };

  return {
    from_timestamp: new Date(now.getTime() - offsetMs[preset]).toISOString(),
    to_timestamp: now.toISOString(),
  };
}

export const DEFAULT_RANGE_PRESET = '30d' as const;

export function defaultTimeRange(): TimeRange {
  return presetToRange(DEFAULT_RANGE_PRESET);
}

// Parses a timestamp string, returning null for empty or unparseable input
// so callers never propagate an Invalid Date (whose .toISOString() throws).
function parseTimestamp(value: string | undefined): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

// Human-readable span of a range, e.g. "1 day", "1 day 6 hours", "30 minutes".
// Minutes are only shown for sub-day ranges to keep it concise.
function humanizeRangeDuration(
  from: string | undefined,
  to: string | undefined,
): string | null {
  const fromDate = parseTimestamp(from);
  const toDate = parseTimestamp(to);
  if (!fromDate || !toDate) {
    return null;
  }

  const ms = toDate.getTime() - fromDate.getTime();
  if (ms <= 0) {
    return null;
  }

  const totalMinutes = Math.round(ms / 60_000);
  const days = Math.floor(totalMinutes / 1440);
  const hours = Math.floor((totalMinutes % 1440) / 60);
  const minutes = totalMinutes % 60;

  const unit = (value: number, name: string) =>
    `${value} ${name}${value === 1 ? '' : 's'}`;

  const parts: string[] = [];
  if (days > 0) {
    parts.push(unit(days, 'day'));
  }
  if (hours > 0) {
    parts.push(unit(hours, 'hour'));
  }
  if (minutes > 0 && days === 0) {
    parts.push(unit(minutes, 'minute'));
  }

  return parts.length > 0 ? parts.join(' ') : 'Less than a minute';
}

function toDateTimeLocalValue(iso: string | undefined): string {
  const date = parseTimestamp(iso);
  if (!date) {
    return '';
  }

  // The model stores UTC ISO, but <input type="datetime-local"> expects local
  // wall-clock time; shift by the offset so the control shows the right moment.
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000);
  // Truncate to YYYY-MM-DDTHH:mm: datetime-local is minute-precision by design,
  // so a confirmed range is intentionally rounded down to the minute.
  return local.toISOString().slice(0, 16);
}

function fromDateTimeLocalValue(value: string): string | undefined {
  // new Date(localString) parses back as local time, inverting the shift above.
  return parseTimestamp(value)?.toISOString();
}

export function RangePicker({ preset, range, onChange }: RangePickerProps) {
  const [isCustomModalOpen, setIsCustomModalOpen] = useState(false);
  const [draftRange, setDraftRange] = useState<DraftRange>(range);
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) {
      return;
    }

    if (isCustomModalOpen && !dialog.open) {
      dialog.showModal();
    } else if (!isCustomModalOpen && dialog.open) {
      dialog.close();
    }
  }, [isCustomModalOpen]);

  const selectedValue = useMemo(
    () => (preset === 'custom' ? CUSTOM_ACTIVE_VALUE : preset),
    [preset],
  );

  const closeCustomModal = useCallback(() => {
    setIsCustomModalOpen(false);
  }, []);

  const handleFromChange = useCallback(
    (event: ChangeEvent<HTMLInputElement>) => {
      setDraftRange((previous) => ({
        ...previous,
        from_timestamp: fromDateTimeLocalValue(event.target.value),
      }));
    },
    [],
  );

  const handleToChange = useCallback((event: ChangeEvent<HTMLInputElement>) => {
    setDraftRange((previous) => ({
      ...previous,
      to_timestamp: fromDateTimeLocalValue(event.target.value),
    }));
  }, []);

  const handlePresetChange = useCallback(
    (event: ChangeEvent<HTMLSelectElement>) => {
      const value = event.target.value;
      // Re-open the picker so a new custom range can be chosen.
      if (value === 'custom') {
        setDraftRange(range);
        setIsCustomModalOpen(true);
        return;
      }
      // Selecting the already-applied custom range, or any unexpected value, is
      // a no-op; the guard narrows away 'custom'/'custom-active' before the call.
      if (!isRangePreset(value) || value === 'custom') {
        return;
      }

      onChange(value, presetToRange(value));
    },
    [onChange, range],
  );

  const handleConfirmCustomRange = useCallback(() => {
    // The Confirm button is disabled unless both endpoints are present and
    // valid; re-check here so the narrowing to TimeRange is enforced by types.
    const { from_timestamp, to_timestamp } = draftRange;
    if (from_timestamp == null || to_timestamp == null) {
      return;
    }

    onChange('custom', { from_timestamp, to_timestamp });
    closeCustomModal();
  }, [closeCustomModal, draftRange, onChange]);

  const handleCancelCustomRange = useCallback(() => {
    setDraftRange(range);
    closeCustomModal();
  }, [closeCustomModal, range]);
  const modalId = useId();
  const modalTitleId = `${modalId}-title`;
  const modalDescriptionId = `${modalId}-description`;

  // Reject missing, unparseable, or inverted ranges. parseTimestamp filters
  // Invalid Dates so a NaN comparison can't silently leave Confirm enabled.
  const fromMs = parseTimestamp(draftRange.from_timestamp)?.getTime();
  const toMs = parseTimestamp(draftRange.to_timestamp)?.getTime();
  const disableConfirm = fromMs == null || toMs == null || fromMs >= toMs;

  const isCustomSelected = preset === 'custom';

  const customDuration = isCustomSelected
    ? humanizeRangeDuration(range.from_timestamp, range.to_timestamp)
    : null;

  return (
    <div style={rootStyle}>
      <StyledSelect
        aria-label="Select activity range"
        value={selectedValue}
        onChange={handlePresetChange}
      >
        {PRESETS.map((presetOption) => (
          <option key={presetOption.value} value={presetOption.value}>
            {presetOption.label}
          </option>
        ))}
        {isCustomSelected ? (
          <option value={CUSTOM_ACTIVE_VALUE}>
            {customDuration ? `Custom (${customDuration})` : 'Custom'}
          </option>
        ) : null}
      </StyledSelect>

      {isCustomModalOpen ? (
        <dialog
          ref={dialogRef}
          style={customDialogStyle}
          aria-labelledby={modalTitleId}
          aria-describedby={modalDescriptionId}
          onCancel={handleCancelCustomRange}
        >
          <div style={customModalStyle}>
            <div style={modalHeadingStyle}>
              <h3 id={modalTitleId} style={modalTitleStyle}>
                Select custom range
              </h3>
              <p id={modalDescriptionId} style={modalDescriptionStyle}>
                Choose exact start and end timestamps, then confirm.
              </p>
            </div>

            <div style={modalInputsStyle}>
              <div style={modalInputFieldStyle}>
                <label style={fieldStyle}>
                  <span style={labelStyle}>From</span>
                  <input
                    aria-label="From timestamp"
                    type="datetime-local"
                    value={toDateTimeLocalValue(draftRange.from_timestamp)}
                    onChange={handleFromChange}
                    style={dateInputStyle}
                  />
                </label>
              </div>

              <div style={modalInputFieldStyle}>
                <label style={fieldStyle}>
                  <span style={labelStyle}>To</span>
                  <input
                    aria-label="To timestamp"
                    type="datetime-local"
                    value={toDateTimeLocalValue(draftRange.to_timestamp)}
                    onChange={handleToChange}
                    style={dateInputStyle}
                  />
                </label>
              </div>
            </div>

            <div style={modalActionsStyle}>
              <button
                type="button"
                onClick={handleCancelCustomRange}
                style={getModalActionButtonStyle('ghost')}
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmCustomRange}
                disabled={disableConfirm}
                style={{
                  ...getModalActionButtonStyle('solid'),
                  opacity: disableConfirm ? 0.45 : 1,
                  cursor: disableConfirm ? 'not-allowed' : 'pointer',
                }}
              >
                Confirm
              </button>
            </div>
          </div>
        </dialog>
      ) : null}
    </div>
  );
}
