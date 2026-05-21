import { useEffect, useMemo, useState } from 'react';
import { updateBusinessHours } from '../lib/api';
import { useBusinessHours } from '../lib/BusinessHoursContext';
import { Alert, Button, Card, CardBody, CardHeader, Label, LoadingState } from '../components/ui';
import { allSlots, formatSlot12 } from '../components/scheduling/slotUtils';

const INTERVAL_OPTIONS = [15, 20, 30, 45, 60, 90, 120];

function toInputTime(t) {
  if (!t) return '';
  return t.length >= 5 ? t.slice(0, 5) : t;
}

function toApiTime(t) {
  if (!t) return '';
  return t.length === 5 ? `${t}:00` : t;
}

function timeToMinutes(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export default function BusinessHoursPage() {
  const { hours, loading, refresh } = useBusinessHours();
  const [openTime, setOpenTime] = useState('');
  const [closeTime, setCloseTime] = useState('');
  const [slotMinutes, setSlotMinutes] = useState(30);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    setOpenTime(toInputTime(hours.open_time));
    setCloseTime(toInputTime(hours.close_time));
    setSlotMinutes(hours.slot_minutes);
  }, [hours]);

  const validationError = useMemo(() => {
    if (!openTime || !closeTime) return 'Open and close times are required';
    const openMin = timeToMinutes(openTime);
    const closeMin = timeToMinutes(closeTime);
    if (openMin >= closeMin) return 'Open time must be earlier than close time';
    if (slotMinutes < 5 || slotMinutes > 240)
      return 'Slot interval must be between 5 and 240 minutes';
    if ((closeMin - openMin) % slotMinutes !== 0)
      return 'Slot interval must evenly divide the open/close window';
    return '';
  }, [openTime, closeTime, slotMinutes]);

  const previewSlots = useMemo(
    () =>
      validationError
        ? []
        : allSlots({
            open_time: toApiTime(openTime),
            close_time: toApiTime(closeTime),
            slot_minutes: slotMinutes,
          }),
    [openTime, closeTime, slotMinutes, validationError],
  );

  const handleSave = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    if (validationError) {
      setError(validationError);
      return;
    }
    setSaving(true);
    const res = await updateBusinessHours({
      open_time: toApiTime(openTime),
      close_time: toApiTime(closeTime),
      slot_minutes: Number(slotMinutes),
    });
    setSaving(false);
    if (res && res.success) {
      setSuccess('Business hours updated');
      refresh();
    } else {
      setError((res && res.message) || 'Failed to update business hours');
    }
  };

  if (loading) return <LoadingState />;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-(--color-foreground)">Business Hours</h1>
        <p className="text-sm text-(--color-muted-foreground) mt-1">
          Configure when clients can request appointments and how long each slot is.
        </p>
      </div>

      <Card>
        <CardHeader title="Schedule" />
        <CardBody>
          <form onSubmit={handleSave} className="space-y-5">
            {error && <Alert variant="error">{error}</Alert>}
            {success && <Alert variant="success">{success}</Alert>}

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <Label className="mb-1.5 block text-sm">Open time</Label>
                <input
                  type="time"
                  value={openTime}
                  onChange={(e) => setOpenTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-(--color-input) bg-(--color-background) text-(--color-foreground)"
                  required
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-sm">Close time</Label>
                <input
                  type="time"
                  value={closeTime}
                  onChange={(e) => setCloseTime(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg border border-(--color-input) bg-(--color-background) text-(--color-foreground)"
                  required
                />
              </div>
              <div>
                <Label className="mb-1.5 block text-sm">Slot interval (min)</Label>
                <select
                  value={slotMinutes}
                  onChange={(e) => setSlotMinutes(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-lg border border-(--color-input) bg-(--color-background) text-(--color-foreground)"
                >
                  {INTERVAL_OPTIONS.map((n) => (
                    <option key={n} value={n}>
                      {n}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {validationError && (
              <p className="text-xs text-(--color-destructive)">{validationError}</p>
            )}

            <div>
              <Label className="mb-1.5 block text-sm">
                Preview ({previewSlots.length} slots)
              </Label>
              <div className="flex flex-wrap gap-1.5 max-h-40 overflow-y-auto border border-(--color-border) rounded-lg p-3 bg-(--color-muted)/30">
                {previewSlots.length === 0 ? (
                  <span className="text-xs text-(--color-muted-foreground)">
                    No slots — fix validation errors above.
                  </span>
                ) : (
                  previewSlots.map((s) => (
                    <span
                      key={s}
                      className="px-2 py-1 rounded bg-(--color-card) border border-(--color-border) text-xs"
                    >
                      {formatSlot12(s)}
                    </span>
                  ))
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={saving || !!validationError}>
                {saving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </form>
        </CardBody>
      </Card>
    </div>
  );
}
