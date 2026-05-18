export const OPEN_HOUR = 9;
export const CLOSE_HOUR = 18;
export const SLOT_MINUTES = 30;

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

export function allSlots() {
  const out = [];
  const total = (CLOSE_HOUR - OPEN_HOUR) * 60;
  for (let off = 0; off < total; off += SLOT_MINUTES) {
    const h = OPEN_HOUR + Math.floor(off / 60);
    const m = off % 60;
    out.push(`${pad2(h)}:${pad2(m)}:00`);
  }
  return out;
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
