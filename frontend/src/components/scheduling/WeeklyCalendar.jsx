import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '../ui';
import useWeekAvailability from './useWeekAvailability';
import {
  WEEKDAYS_SHORT,
  WEEKDAYS_INITIAL,
  WEEKDAYS_LONG,
  addDays,
  allSlots,
  formatSlot12,
  formatWeekRange,
  isPastSlot,
  isSameDayIso,
  resolvedTimezone,
  toIsoDate,
  weekDates,
  weekStartOf,
} from './slotUtils';

function classNames(...xs) {
  return xs.filter(Boolean).join(' ');
}

export default function WeeklyCalendar({
  mode = 'select',
  value = null,
  onChange,
  onSlotClick,
  blockedSet,
  allowOverride = false,
  initialWeekStart,
  loading: externalLoading = false,
  refreshToken = 0,
}) {
  const today = useMemo(() => new Date(), []);
  const [weekStart, setWeekStart] = useState(() =>
    weekStartOf(initialWeekStart || today),
  );
  const { daysMap, loading: dataLoading, error, refetch } = useWeekAvailability(weekStart);

  useEffect(() => {
    if (refreshToken) refetch();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refreshToken]);
  const loading = dataLoading || externalLoading;

  const days = weekDates(weekStart);
  const slots = useMemo(allSlots, []);

  const [focus, setFocus] = useState({ row: 0, col: 0 });
  const cellRefs = useRef({});
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    setFocus((f) => ({
      row: Math.min(f.row, slots.length - 1),
      col: Math.min(f.col, days.length - 1),
    }));
  }, [days.length, slots.length]);

  const getCellState = (iso, slot) => {
    if (isPastSlot(iso, slot, today)) return 'past';
    const key = `${iso} ${slot}`;
    if (blockedSet && blockedSet.has(key)) return 'blocked';
    const avail = daysMap[iso];
    if (avail) {
      const meta = avail.find((a) => a.time_slot === slot);
      if (meta && meta.available === false) return 'blocked';
      if (!meta) return 'loading';
    } else {
      return 'loading';
    }
    if (value && value.date === iso && value.slot === slot) return 'selected';
    return 'available';
  };

  const handleCellActivate = (iso, slot, state) => {
    if (state === 'past') return;
    if (state === 'loading') return;
    if (mode === 'select') {
      if (state === 'blocked' && !allowOverride) return;
      const next = { date: iso, slot, blocked: state === 'blocked' };
      onChange && onChange(next);
      setAnnouncement(
        `Selected ${new Date(iso + 'T00:00:00').toLocaleDateString(undefined, {
          weekday: 'long',
          month: 'long',
          day: 'numeric',
        })} at ${formatSlot12(slot)}`,
      );
    } else if (mode === 'block') {
      onSlotClick && onSlotClick(iso, slot, state === 'blocked');
    }
  };

  const moveFocus = (drow, dcol) => {
    setFocus((f) => {
      const row = Math.max(0, Math.min(slots.length - 1, f.row + drow));
      const col = Math.max(0, Math.min(days.length - 1, f.col + dcol));
      const key = `${row}-${col}`;
      const el = cellRefs.current[key];
      if (el) el.focus();
      return { row, col };
    });
  };

  const handleKeyDown = (e, row, col, iso, slot, state) => {
    switch (e.key) {
      case 'ArrowUp': e.preventDefault(); moveFocus(-1, 0); break;
      case 'ArrowDown': e.preventDefault(); moveFocus(1, 0); break;
      case 'ArrowLeft': e.preventDefault(); moveFocus(0, -1); break;
      case 'ArrowRight': e.preventDefault(); moveFocus(0, 1); break;
      case 'Home': e.preventDefault(); setFocus({ row, col: 0 }); cellRefs.current[`${row}-0`]?.focus(); break;
      case 'End': e.preventDefault(); setFocus({ row, col: days.length - 1 }); cellRefs.current[`${row}-${days.length - 1}`]?.focus(); break;
      case 'Enter':
      case ' ':
        e.preventDefault();
        handleCellActivate(iso, slot, state);
        break;
      default: break;
    }
  };

  useEffect(() => {
    if (loading) setAnnouncement('Loading availability');
    else if (error) setAnnouncement('Failed to load availability');
  }, [loading, error]);

  const goPrev = () => setWeekStart((w) => addDays(w, -7));
  const goNext = () => setWeekStart((w) => addDays(w, 7));
  const goToday = () => setWeekStart(weekStartOf(new Date()));

  const tz = resolvedTimezone();

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={goPrev}
            aria-label="Previous week"
          >
            <ChevronLeft size={16} />
          </Button>
          <div className="text-sm sm:text-base font-medium text-(--color-foreground) min-w-[10rem] text-center">
            {formatWeekRange(weekStart)}
          </div>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={goNext}
            aria-label="Next week"
          >
            <ChevronRight size={16} />
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <Button type="button" variant="outline" size="sm" onClick={goToday}>
            Today
          </Button>
          <span className="hidden sm:inline text-xs text-(--color-muted-foreground)">
            {tz}
          </span>
        </div>
      </div>

      <div
        className="overflow-x-auto border border-(--color-border) rounded-xl bg-(--color-card)"
        role="region"
        aria-label="Weekly availability calendar"
      >
        <table className="w-full border-collapse text-xs sm:text-sm">
          <thead className="sticky top-0 z-10 bg-(--color-card)">
            <tr>
              <th
                scope="col"
                className="sticky left-0 z-20 bg-(--color-card) w-12 sm:w-16 px-1 py-2 text-(--color-muted-foreground) font-normal text-[10px] sm:text-xs"
              >
                Time
              </th>
              {days.map((d) => {
                const iso = toIsoDate(d);
                const isToday = isSameDayIso(iso, today);
                return (
                  <th
                    key={iso}
                    scope="col"
                    className={classNames(
                      'px-1 py-2 font-medium text-(--color-foreground) border-l border-(--color-border)',
                      isToday && 'bg-(--color-primary)/5',
                    )}
                  >
                    <div className="flex flex-col items-center leading-tight">
                      <span className="text-[10px] sm:text-xs uppercase tracking-wide text-(--color-muted-foreground)">
                        <span className="hidden sm:inline">{WEEKDAYS_SHORT[d.getDay()]}</span>
                        <span className="sm:hidden">{WEEKDAYS_INITIAL[d.getDay()]}</span>
                      </span>
                      <span className="text-sm sm:text-base">{d.getDate()}</span>
                      {isToday && (
                        <span
                          className="mt-0.5 h-1 w-1 rounded-full bg-(--color-primary)"
                          aria-hidden="true"
                        />
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          <tbody>
            {slots.map((slot, row) => (
              <tr key={slot} className="border-t border-(--color-border)">
                <th
                  scope="row"
                  className="sticky left-0 z-10 bg-(--color-card) px-1 py-1 text-right text-[10px] sm:text-xs text-(--color-muted-foreground) font-normal whitespace-nowrap"
                >
                  {formatSlot12(slot)}
                </th>
                {days.map((d, col) => {
                  const iso = toIsoDate(d);
                  const state = getCellState(iso, slot);
                  const isFocused = focus.row === row && focus.col === col;
                  const interactive =
                    state === 'available' ||
                    state === 'selected' ||
                    (mode === 'block' && state === 'blocked') ||
                    (mode === 'select' && state === 'blocked' && allowOverride);
                  const label = `${WEEKDAYS_LONG[d.getDay()]} ${d.toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}, ${formatSlot12(slot)}, ${state}`;
                  return (
                    <td
                      key={iso + slot}
                      className={classNames(
                        'p-0 border-l border-(--color-border)',
                        isSameDayIso(iso, today) && 'bg-(--color-primary)/5',
                      )}
                    >
                      <button
                        ref={(el) => {
                          if (el) cellRefs.current[`${row}-${col}`] = el;
                        }}
                        type="button"
                        tabIndex={isFocused ? 0 : -1}
                        disabled={!interactive}
                        aria-disabled={!interactive}
                        aria-label={label}
                        aria-pressed={state === 'selected'}
                        onClick={() => handleCellActivate(iso, slot, state)}
                        onFocus={() => setFocus({ row, col })}
                        onKeyDown={(e) => handleKeyDown(e, row, col, iso, slot, state)}
                        className={classNames(
                          'block w-full h-9 sm:h-10 motion-safe:transition-colors motion-safe:duration-150',
                          'focus:outline-none focus:ring-2 focus:ring-(--color-ring) focus:ring-inset',
                          state === 'available' &&
                            'bg-transparent hover:bg-(--color-primary)/10 cursor-pointer',
                          state === 'selected' &&
                            'bg-(--color-primary) text-(--color-primary-foreground) font-semibold',
                          state === 'blocked' &&
                            'cursor-not-allowed text-(--color-muted-foreground) blocked-stripe',
                          mode === 'block' && state === 'blocked' && 'cursor-pointer',
                          mode === 'select' && state === 'blocked' && allowOverride && 'cursor-pointer',
                          state === 'past' && 'opacity-40 cursor-not-allowed bg-(--color-muted)/40',
                          state === 'loading' && 'animate-pulse bg-(--color-muted)/40',
                        )}
                      />
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="flex flex-wrap items-center gap-3 text-xs text-(--color-muted-foreground)">
        <LegendSwatch className="bg-(--color-card) border border-(--color-border)" label="Available" />
        <LegendSwatch className="bg-(--color-primary)" label={mode === 'block' ? 'Selected' : 'Selected'} />
        <LegendSwatch className="blocked-stripe border border-(--color-border)" label={mode === 'block' ? 'Blocked (click to unblock)' : 'Blocked'} />
        <LegendSwatch className="bg-(--color-muted)/60 border border-(--color-border)" label="Past" />
      </div>

      {error && (
        <p className="text-xs text-(--color-destructive)">{error}</p>
      )}

      <div className="sr-only" aria-live="polite">{announcement}</div>
    </div>
  );
}

function LegendSwatch({ className, label }) {
  return (
    <span className="inline-flex items-center gap-1.5">
      <span className={classNames('inline-block h-3 w-4 rounded-sm', className)} aria-hidden="true" />
      <span>{label}</span>
    </span>
  );
}
