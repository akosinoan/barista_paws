import { useEffect, useState } from 'react';
import {
  getBlockedTimeslots,
  blockTimeslot,
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

export default function BlockedSlotManager() {
  const [blocked, setBlocked] = useState([]);
  const [loading, setLoading] = useState(true);
  const [pending, setPending] = useState(null); // { iso, slot }
  const [reason, setReason] = useState('');
  const [wholeDay, setWholeDay] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [refreshToken, setRefreshToken] = useState(0);

  const reload = () => {
    getBlockedTimeslots().then((res) => {
      if (res.success) setBlocked(res.data || []);
      setLoading(false);
    });
  };

  useEffect(() => {
    reload();
  }, []);

  const findBlock = (iso, slot) => {
    return blocked.find(
      (b) =>
        b.blocked_date === iso &&
        (b.time_slot === slot || b.time_slot === slot.slice(0, 5)),
    );
  };
  const findWholeDayBlock = (iso) =>
    blocked.find((b) => b.blocked_date === iso && b.time_slot === null);

  const handleSlotClick = async (iso, slot, currentlyBlocked) => {
    setError('');
    if (currentlyBlocked) {
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
    } else {
      setPending({ iso, slot });
      setReason('');
      setWholeDay(false);
    }
  };

  const cancelPending = () => {
    setPending(null);
    setReason('');
    setWholeDay(false);
  };

  const confirmBlock = async (e) => {
    e.preventDefault();
    if (!pending) return;
    setSubmitting(true);
    setError('');
    const res = await blockTimeslot({
      blocked_date: pending.iso,
      time_slot: wholeDay ? null : normalizeSlot(pending.slot),
      reason: reason || null,
    });
    setSubmitting(false);
    if (res.success) {
      setBlocked((cur) => [res.data, ...cur]);
      setRefreshToken((t) => t + 1);
      cancelPending();
    } else {
      setError(res.message || 'Failed to block timeslot');
    }
  };

  return (
    <div className="space-y-4">
      {error && <Alert variant="error">{error}</Alert>}

      <WeeklyCalendar
        mode="block"
        onSlotClick={handleSlotClick}
        loading={submitting}
        refreshToken={refreshToken}
      />

      {pending && (
        <form
          onSubmit={confirmBlock}
          className="rounded-xl border border-(--color-border) bg-(--color-card) p-4 space-y-3"
        >
          <div className="text-sm">
            <span className="text-(--color-muted-foreground)">Blocking: </span>
            <span className="font-medium text-(--color-foreground)">
              {parseIsoDate(pending.iso).toLocaleDateString(undefined, {
                weekday: 'long',
                month: 'long',
                day: 'numeric',
              })}{' '}
              · {formatSlot12(pending.slot)}
            </span>
          </div>

          <label className="flex items-center gap-2 text-sm text-(--color-foreground) cursor-pointer">
            <input
              type="checkbox"
              checked={wholeDay}
              onChange={(e) => setWholeDay(e.target.checked)}
              className="w-4 h-4 accent-(--color-primary)"
            />
            Block the entire day instead
          </label>

          <div>
            <Label>Reason</Label>
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
              onClick={cancelPending}
              disabled={submitting}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={submitting}>
              {submitting ? 'Blocking...' : 'Confirm Block'}
            </Button>
          </div>
        </form>
      )}

      <div className="pt-4 border-t border-(--color-border)">
        <h3 className="text-sm font-semibold mb-3 text-(--color-foreground)">
          Active Blocks
        </h3>
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
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={async () => {
                    if (!confirm('Unblock this timeslot?')) return;
                    const res = await unblockTimeslot(b.id);
                    if (res.success) {
                      setBlocked((cur) => cur.filter((x) => x.id !== b.id));
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
