// Fallback defaults — match the migration seed. Runtime should use the live
// business hours from BusinessHoursContext rather than these constants.
export const DEFAULT_OPEN_TIME = '09:00:00';
export const DEFAULT_CLOSE_TIME = '18:00:00';
export const DEFAULT_SLOT_MINUTES = 30;

export const WEEKDAYS_LONG = [
  'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday',
];
export const WEEKDAYS_SHORT = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
export const WEEKDAYS_INITIAL = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

export function pad2(n) {
  return String(n).padStart(2, '0');
}

export function toIsoDate(d) {
  return `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
}

export function parseIsoDate(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}

// Monday-start week. Returns a Date set to local midnight.
export function weekStartOf(date) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  const dow = d.getDay();
  const diff = (dow + 6) % 7;
  d.setDate(d.getDate() - diff);
  return d;
}

export function addDays(date, n) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate());
  d.setDate(d.getDate() + n);
  return d;
}

export function weekDates(weekStart) {
  return Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
}

function timeToMinutes(t) {
  if (!t) return 0;
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function minutesToSlot(m) {
  return `${pad2(Math.floor(m / 60))}:${pad2(m % 60)}:00`;
}

export function allSlots(hours) {
  const open = timeToMinutes(hours?.open_time || DEFAULT_OPEN_TIME);
  const close = timeToMinutes(hours?.close_time || DEFAULT_CLOSE_TIME);
  const step = Math.max(1, hours?.slot_minutes || DEFAULT_SLOT_MINUTES);
  const out = [];
  for (let m = open; m < close; m += step) {
    out.push(minutesToSlot(m));
  }
  return out;
}

// Full-day slot grid aligned to `open_time`/`slot_minutes`. Used by the admin
// override view so admins can pick any time in the day.
export function allDaySlots(hours) {
  const open = timeToMinutes(hours?.open_time || DEFAULT_OPEN_TIME);
  const step = Math.max(1, hours?.slot_minutes || DEFAULT_SLOT_MINUTES);
  const offset = open % step;
  const out = [];
  for (let m = offset; m < 24 * 60; m += step) {
    out.push(minutesToSlot(m));
  }
  return out;
}

export function isWithinBusinessHours(slot, hours) {
  const open = timeToMinutes(hours?.open_time || DEFAULT_OPEN_TIME);
  const close = timeToMinutes(hours?.close_time || DEFAULT_CLOSE_TIME);
  const m = timeToMinutes(slot.length === 5 ? `${slot}:00` : slot);
  return m >= open && m < close;
}

export function formatTimeRange(hours) {
  const open = hours?.open_time || DEFAULT_OPEN_TIME;
  const close = hours?.close_time || DEFAULT_CLOSE_TIME;
  return `${formatSlot12(open)} – ${formatSlot12(close)}`;
}

export function formatSlot12(slot) {
  const h = parseInt(slot.slice(0, 2), 10);
  const m = slot.slice(3, 5);
  const period = h >= 12 ? 'PM' : 'AM';
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m} ${period}`;
}

export function normalizeSlot(slot) {
  return slot && slot.length === 5 ? `${slot}:00` : slot;
}

export function isPastSlot(iso, slot, now = new Date()) {
  const [y, mo, d] = iso.split('-').map(Number);
  const [h, mi] = slot.split(':').map(Number);
  const cellDate = new Date(y, mo - 1, d, h, mi);
  return cellDate.getTime() < now.getTime();
}

export function isSameDayIso(iso, date = new Date()) {
  return iso === toIsoDate(date);
}

export function formatWeekRange(weekStart) {
  const end = addDays(weekStart, 6);
  const sameMonth = weekStart.getMonth() === end.getMonth();
  const sameYear = weekStart.getFullYear() === end.getFullYear();
  const startFmt = weekStart.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    ...(sameYear ? {} : { year: 'numeric' }),
  });
  const endFmt = end.toLocaleDateString(undefined, {
    month: sameMonth ? undefined : 'short',
    day: 'numeric',
    year: 'numeric',
  });
  return `${startFmt} – ${endFmt}`;
}

export function resolvedTimezone() {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || 'Local';
  } catch {
    return 'Local';
  }
}
