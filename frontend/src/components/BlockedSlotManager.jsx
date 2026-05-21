import { useEffect, useMemo, useState } from 'react';
import {
  getBlockedTimeslots,
  bulkBlockTimeslots,
  bulkUnblockTimeslots,
  unblockTimeslot,
} from '../lib/api';
import { Button, Input, Label, Alert } from './ui';
import { Trash2 } from 'lucide-react';
import WeeklyCalendar from './scheduling/WeeklyCalendar';
import { formatSlot12, normalizeSlot, parseIsoDate } from './scheduling/slotUtils';

function formatDate(iso) {
  try {
    return parseIsoDate(iso).toLocaleDateString(undefined, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
  } catch {
    return iso;
  }
}

const keyOf = (iso, slot) => `${iso} ${slot}`;

export default function BlockedSlotManager() {
  const [blocked, setBlocked] = useState([]);
  const [loading, setLoading] = useState(true);
  // pending: Map<key, { iso, slot }>
  const [pending, setPending] = useState(new Map());
  const [reason, setReason] = useState('');
  const [wholeDay, setWholeDay] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);
  const [selectedUnblockIds, setSelectedUnblockIds] = useState(new Set());

  const reload = () => {
    getBlockedTimeslots().then((res) => {
      if (res.success) setBlocked(res.data || []);
      setLoading(false);
    });
  };

  useEffect(() => {
    reload();
  }, []);

  const selectedKeys = useMemo(() => new Set(pending.keys()), [pending]);

  const findBlock = (iso, slot) =>
    blocked.find(
      (b) =>
        b.blocked_date === iso &&
        (b.time_slot === slot || b.time_slot === slot.slice(0, 5)),
    );
  const findWholeDayBlock = (iso) =>
    blocked.find((b) => b.blocked_date === iso && b.time_slot === null);

  const togglePending = (iso, slot) => {
    setPending((cur) => {
      const next = new Map(cur);
      const key = keyOf(iso, slot);
      if (next.has(key)) next.delete(key);
      else next.set(key, { iso, slot });
      return next;
    });
  };

  const handleSlotClick = async (iso, slot, state) => {
    setError('');
    if (state === 'blocked') {
      // Unblock immediately (single).
      const exact = findBlock(iso, slot);
      const whole = findWholeDayBlock(iso);
      const target = exact || whole;
      if (!target) {
        setError('Could not find the block to remove.');
        return;
      }
      const msg = target.time_slot
        ? 'Unblock this timeslot?'
        : 'Unblock the entire day?';
      if (!confirm(msg)) return;
      const res = await unblockTimeslot(target.id);
      if (res.success) {
        setBlocked((cur) => cur.filter((b) => b.id !== target.id));
        setRefreshToken((t) => t + 1);
      } else {
        setError(res.message || 'Failed to unblock.');
      }
      return;
    }
    if (state === 'available' || state === 'selected') {
      togglePending(iso, slot);
    }
  };

  const clearPending = () => {
    setPending(new Map());
    setReason('');
    setWholeDay(false);
  };

  const confirmBlock = async (e) => {
    e.preventDefault();
    if (pending.size === 0) return;
    setSubmitting(true);
    setError('');

    let slots;
    if (wholeDay) {
      const dates = Array.from(new Set(Array.from(pending.values()).map((p) => p.iso)));
      slots = dates.map((iso) => ({
        blocked_date: iso,
        time_slot: null,
        reason: reason || null,
      }));
    } else {
      slots = Array.from(pending.values()).map(({ iso, slot }) => ({
        blocked_date: iso,
        time_slot: normalizeSlot(slot),
        reason: reason || null,
      }));
    }

    const res = await bulkBlockTimeslots(slots);
    setSubmitting(false);
    if (res.success) {
      setBlocked((cur) => [...(res.data || []), ...cur]);
      setRefreshToken((t) => t + 1);
      clearPending();
    } else {
      setError(res.message || 'Failed to block timeslots');
    }
  };

  const toggleUnblockId = (id) => {
    setSelectedUnblockIds((cur) => {
      const next = new Set(cur);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSelectAllUnblocks = () => {
    setSelectedUnblockIds((cur) => {
      if (cur.size === blocked.length) return new Set();
      return new Set(blocked.map((b) => b.id));
    });
  };

  const handleBulkUnblock = async () => {
    if (selectedUnblockIds.size === 0) return;
    if (!confirm(`Unblock ${selectedUnblockIds.size} timeslot(s)?`)) return;
    const ids = Array.from(selectedUnblockIds);
    const res = await bulkUnblockTimeslots(ids);
    if (res.success) {
      setBlocked((cur) => cur.filter((b) => !selectedUnblockIds.has(b.id)));
      setSelectedUnblockIds(new Set());
      setRefreshToken((t) => t + 1);
    } else {
      setError(res.message || 'Failed to bulk unblock');
    }
  };

  const allSelected =
    blocked.length > 0 && selectedUnblockIds.size === blocked.length;

  return (
    <div className="space-y-4">
      {error && <Alert variant="error">{error}</Alert>}

      <WeeklyCalendar
        mode="block"
        onSlotClick={handleSlotClick}
        selectedKeys={selectedKeys}
        loading={submitting}
        refreshToken={refreshToken}
      />

      {pending.size > 0 && (
        <form
          onSubmit={confirmBlock}
          className="rounded-xl border border-(--color-border) bg-(--color-card) p-4 space-y-3"
        >
          <div className="flex items-center justify-between">
            <div className="text-sm">
              <span className="text-(--color-muted-foreground)">Selected: </span>
              <span className="font-medium text-(--color-foreground)">
                {pending.size} timeslot{pending.size === 1 ? '' : 's'}
              </span>
            </div>
            <button
              type="button"
              onClick={clearPending}
              disabled={submitting}
              className="text-xs text-(--color-primary) hover:underline cursor-pointer disabled:opacity-50"
            >
              Clear selection
            </button>
          </div>

          <div className="max-h-32 overflow-y-auto text-xs text-(--color-muted-foreground) space-y-1 border border-(--color-border) rounded-md p-2">
            {Array.from(pending.values())
              .sort((a, b) =>
                a.iso === b.iso ? a.slot.localeCompare(b.slot) : a.iso.localeCompare(b.iso),
              )
              .map(({ iso, slot }) => (
                <div key={keyOf(iso, slot)} className="flex items-center justify-between">
                  <span>
                    {parseIsoDate(iso).toLocaleDateString(undefined, {
                      weekday: 'short',
                      month: 'short',
                      day: 'numeric',
                    })}{' '}
                    · {formatSlot12(slot)}
                  </span>
                  <button
                    type="button"
                    onClick={() => togglePending(iso, slot)}
                    className="text-(--color-destructive) hover:underline cursor-pointer"
                  >
                    remove
                  </button>
                </div>
              ))}
          </div>

          <label className="flex items-center gap-2 text-sm text-(--color-foreground) cursor-pointer">
            <input
              type="checkbox"
              checked={wholeDay}
              onChange={(e) => setWholeDay(e.target.checked)}
              className="w-4 h-4 accent-(--color-primary)"
            />
            Block whole day for each selected date instead
          </label>

          <div>
            <Label>Reason (applies to all)</Label>
            <Input
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Holiday, Staff training"
            />
          </div>

          <div className="flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={clearPending}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting
                ? 'Blocking...'
                : `Block ${pending.size} timeslot${pending.size === 1 ? '' : 's'}`}
            </Button>
          </div>
        </form>
      )}

      <div className="pt-4 border-t border-(--color-border)">
        <div className="flex items-center justify-between mb-3 gap-2 flex-wrap">
          <h3 className="text-sm font-semibold text-(--color-foreground)">
            Active Blocks
          </h3>
          {blocked.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="flex items-center gap-2 text-xs text-(--color-muted-foreground) cursor-pointer">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAllUnblocks}
                  className="w-4 h-4 accent-(--color-primary)"
                />
                Select all
              </label>
              <Button
                size="sm"
                variant="destructive"
                onClick={handleBulkUnblock}
                disabled={selectedUnblockIds.size === 0}
              >
                <Trash2 size={14} /> Unblock selected ({selectedUnblockIds.size})
              </Button>
            </div>
          )}
        </div>
        {loading ? (
          <p className="text-sm text-(--color-muted-foreground)">Loading...</p>
        ) : blocked.length === 0 ? (
          <p className="text-sm text-(--color-muted-foreground)">No blocked timeslots.</p>
        ) : (
          <div className="space-y-2">
            {blocked.map((b) => (
              <div
                key={b.id}
                className="flex items-center justify-between gap-3 p-3 border border-(--color-border) rounded-lg"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedUnblockIds.has(b.id)}
                    onChange={() => toggleUnblockId(b.id)}
                    className="w-4 h-4 accent-(--color-primary) cursor-pointer"
                    aria-label="Select for bulk unblock"
                  />
                  <div className="text-sm">
                    <p className="font-medium text-(--color-foreground)">
                      {formatDate(b.blocked_date)}
                      {b.time_slot
                        ? ` · ${formatSlot12(b.time_slot.length === 5 ? `${b.time_slot}:00` : b.time_slot)}`
                        : ' · Whole day'}
                    </p>
                    {b.reason && (
                      <p className="text-xs text-(--color-muted-foreground) mt-0.5">{b.reason}</p>
                    )}
                  </div>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={async () => {
                    if (!confirm('Unblock this timeslot?')) return;
                    const res = await unblockTimeslot(b.id);
                    if (res.success) {
                      setBlocked((cur) => cur.filter((x) => x.id !== b.id));
                      setSelectedUnblockIds((cur) => {
                        const next = new Set(cur);
                        next.delete(b.id);
                        return next;
                      });
                      setRefreshToken((t) => t + 1);
                    }
                  }}
                  aria-label="Unblock"
                >
                  <Trash2 size={14} /> Unblock
                </Button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
