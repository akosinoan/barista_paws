import { useState, useEffect } from 'react';
import {
  getAvailableTimeslots,
  getBlockedTimeslots,
  blockTimeslot,
  unblockTimeslot,
} from '../lib/api';
import { Button, Input, Label, Alert, DateField } from './ui';
import { Trash2 } from 'lucide-react';
import { todayIso } from '../lib/utils';

function formatDate(iso) {
  try {
    const d = new Date(`${iso}T00:00:00`);
    return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}

export default function BlockedSlotManager() {
  const [blocked, setBlocked] = useState([]);
  const [loading, setLoading] = useState(true);
  const [date, setDate] = useState('');
  const [slot, setSlot] = useState('');
  const [wholeDay, setWholeDay] = useState(false);
  const [reason, setReason] = useState('');
  const [availability, setAvailability] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const reload = () => {
    getBlockedTimeslots().then((res) => {
      if (res.success) setBlocked(res.data || []);
      setLoading(false);
    });
  };

  useEffect(() => {
    reload();
  }, []);

  useEffect(() => {
    if (!date) {
      setAvailability([]);
      return;
    }
    getAvailableTimeslots(date).then((res) => {
      if (res.success) setAvailability(res.data || []);
    });
    setSlot('');
  }, [date]);

  const handleBlock = async (e) => {
    e.preventDefault();
    setError('');
    if (!date) {
      setError('Select a date');
      return;
    }
    if (!wholeDay && !slot) {
      setError('Select a timeslot or choose "Whole day"');
      return;
    }
    setSubmitting(true);
    const res = await blockTimeslot({
      blocked_date: date,
      time_slot: wholeDay ? null : (slot.length === 5 ? `${slot}:00` : slot),
      reason: reason || null,
    });
    setSubmitting(false);
    if (res.success) {
      setBlocked([res.data, ...blocked]);
      setDate('');
      setSlot('');
      setReason('');
      setWholeDay(false);
    } else {
      setError(res.message || 'Failed to block timeslot');
    }
  };

  const handleUnblock = async (id) => {
    if (!confirm('Unblock this timeslot?')) return;
    const res = await unblockTimeslot(id);
    if (res.success) {
      setBlocked(blocked.filter((b) => b.id !== id));
    }
  };

  return (
    <div className="space-y-4">
      <form onSubmit={handleBlock} className="space-y-3">
        {error && <Alert variant="error">{error}</Alert>}

        <div className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label>Date *</Label>
            <DateField value={date} onChange={setDate} min={todayIso()} required />
          </div>
          <div>
            <Label>Timeslot</Label>
            <select
              value={slot}
              onChange={(e) => setSlot(e.target.value)}
              disabled={!date || wholeDay}
              className="w-full px-3 py-2 rounded-lg border border-(--color-input) bg-(--color-background) text-(--color-foreground) focus:outline-none focus:ring-2 focus:ring-(--color-ring) text-sm disabled:opacity-60"
            >
              <option value="">
                {!date ? 'Select a date first' : 'Choose a timeslot'}
              </option>
              {availability.map((a) => (
                <option key={a.time_slot} value={a.time_slot}>
                  {a.time_slot.slice(0, 5)}
                  {!a.available ? ' (already blocked)' : ''}
                </option>
              ))}
            </select>
          </div>
        </div>

        <label className="flex items-center gap-2 text-sm text-(--color-foreground) cursor-pointer">
          <input
            type="checkbox"
            checked={wholeDay}
            onChange={(e) => setWholeDay(e.target.checked)}
          />
          Block the whole day
        </label>

        <div>
          <Label>Reason</Label>
          <Input
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="e.g. Holiday, Staff training"
          />
        </div>

        <div className="flex justify-end">
          <Button type="submit" disabled={submitting}>
            {submitting ? 'Blocking...' : 'Block Timeslot'}
          </Button>
        </div>
      </form>

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
                    {b.time_slot ? ` · ${b.time_slot.slice(0, 5)}` : ' · Whole day'}
                  </p>
                  {b.reason && (
                    <p className="text-xs text-(--color-muted-foreground) mt-0.5">{b.reason}</p>
                  )}
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleUnblock(b.id)}
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
