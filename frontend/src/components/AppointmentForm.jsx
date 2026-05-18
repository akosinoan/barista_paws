import { useEffect, useState } from 'react';
import { getPetsByOwner } from '../lib/api';
import { Button, Label, Alert } from './ui';
import WeeklyCalendar from './scheduling/WeeklyCalendar';
import WaiverModal from './scheduling/WaiverModal';
import { formatSlot12, normalizeSlot, parseIsoDate } from './scheduling/slotUtils';

const FIELD_CLASS =
  'w-full px-4 py-3 rounded-lg border border-(--color-input) bg-(--color-background) text-(--color-foreground) text-base focus:outline-none focus:ring-2 focus:ring-(--color-ring) disabled:opacity-60';

export default function AppointmentForm({
  ownerId,
  onSubmit,
  onCancel,
  allowOverride = false,
  skipWaiver = false,
}) {
  const [pets, setPets] = useState([]);
  const [selectedPets, setSelectedPets] = useState([]);
  const [selection, setSelection] = useState(null);
  const [notes, setNotes] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [waiverOpen, setWaiverOpen] = useState(false);
  const [pendingForce, setPendingForce] = useState(false);

  useEffect(() => {
    getPetsByOwner(ownerId).then((res) => {
      if (res.success) setPets(res.data || []);
    });
  }, [ownerId]);

  const togglePet = (petId) => {
    setSelectedPets((cur) =>
      cur.includes(petId) ? cur.filter((id) => id !== petId) : [...cur, petId],
    );
  };

  const isSlotBlocked = !!(selection && selection.blocked);
  const needsOverrideConfirm = allowOverride && isSlotBlocked;

  const submitAppointment = async (waiverPayload, force) => {
    setSubmitting(true);
    const body = {
      appointment_date: selection.date,
      time_slot: normalizeSlot(selection.slot),
      pet_ids: selectedPets,
      notes: notes || null,
      force,
    };
    if (waiverPayload) body.waiver = waiverPayload;
    const res = await onSubmit(body);
    setSubmitting(false);
    if (res && res.success === false) {
      setError(res.message || 'Failed to create appointment');
      // Keep modal open on stale waiver so user can re-load and re-sign
      if (res?.data?.code !== 'WAIVER_VERSION_STALE') {
        setWaiverOpen(false);
      }
    } else {
      setWaiverOpen(false);
    }
  };

  const validateBeforeWaiver = () => {
    setError('');
    if (!selection) {
      setError('Please select a date and timeslot');
      return false;
    }
    if (selectedPets.length === 0) {
      setError('Please select at least one pet');
      return false;
    }
    if (isSlotBlocked && !allowOverride) {
      setError('Selected timeslot is unavailable');
      return false;
    }
    return true;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (needsOverrideConfirm) return;
    if (!validateBeforeWaiver()) return;
    setPendingForce(false);
    if (skipWaiver) {
      submitAppointment(null, false);
    } else {
      setWaiverOpen(true);
    }
  };

  const handleConfirmOverride = () => {
    if (!validateBeforeWaiver()) return;
    setPendingForce(true);
    if (skipWaiver) {
      submitAppointment(null, true);
    } else {
      setWaiverOpen(true);
    }
  };

  const selectionLabel = selection
    ? `${parseIsoDate(selection.date).toLocaleDateString(undefined, {
        weekday: 'long',
        month: 'long',
        day: 'numeric',
      })} · ${formatSlot12(selection.slot)}`
    : null;

  const selectedPetNames = pets
    .filter((p) => selectedPets.includes(p.id))
    .map((p) => p.name);

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <Alert variant="error">{error}</Alert>}

      <div>
        <Label className="mb-1.5 block text-sm">Pick a timeslot *</Label>
        <WeeklyCalendar
          mode="select"
          value={selection}
          onChange={setSelection}
          allowOverride={allowOverride}
        />
        {selectionLabel && (
          <p className="mt-2 text-sm text-(--color-foreground)">
            <span className="text-(--color-muted-foreground)">Selected: </span>
            <span className="font-medium">{selectionLabel}</span>
            {isSlotBlocked && (
              <span className="ml-2 text-(--color-destructive)">(blocked)</span>
            )}
          </p>
        )}
      </div>

      <div>
        <Label className="mb-1.5 block text-sm">Pets *</Label>
        {pets.length === 0 ? (
          <p className="text-sm text-(--color-muted-foreground)">
            You have no pets registered. Add a pet first.
          </p>
        ) : (
          <div className="border border-(--color-border) rounded-lg overflow-hidden divide-y divide-(--color-border)">
            {pets.map((pet) => (
              <label
                key={pet.id}
                className="flex items-center gap-3 p-4 hover:bg-(--color-muted) cursor-pointer transition-colors"
              >
                <input
                  type="checkbox"
                  checked={selectedPets.includes(pet.id)}
                  onChange={() => togglePet(pet.id)}
                  className="w-5 h-5 accent-(--color-primary) cursor-pointer shrink-0"
                />
                <span className="text-base text-(--color-foreground)">
                  {pet.name}{' '}
                  <span className="text-(--color-muted-foreground)">· {pet.species}</span>
                </span>
              </label>
            ))}
          </div>
        )}
      </div>

      <div>
        <Label className="mb-1.5 block text-sm">Notes</Label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={4}
          placeholder="Any additional information..."
          className={FIELD_CLASS}
        />
      </div>

      {needsOverrideConfirm && (
        <Alert variant="warning">
          This timeslot is blocked. You can override it as an admin.
        </Alert>
      )}

      <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-2">
        {onCancel && (
          <Button
            type="button"
            variant="outline"
            onClick={onCancel}
            disabled={submitting}
            className="w-full sm:w-auto py-3 text-base sm:py-2 sm:text-sm"
          >
            Cancel
          </Button>
        )}
        {needsOverrideConfirm ? (
          <Button
            type="button"
            variant="destructive"
            onClick={handleConfirmOverride}
            disabled={submitting}
            className="w-full sm:w-auto py-3 text-base sm:py-2 sm:text-sm"
          >
            {submitting ? 'Submitting...' : 'Confirm Override'}
          </Button>
        ) : (
          <Button
            type="submit"
            disabled={submitting}
            className="w-full sm:w-auto py-3 text-base sm:py-2 sm:text-sm"
          >
            {submitting
              ? 'Submitting...'
              : skipWaiver
                ? 'Request Appointment'
                : 'Continue to Waiver'}
          </Button>
        )}
      </div>

      {!skipWaiver && (
        <WaiverModal
          open={waiverOpen}
          onClose={() => (submitting ? null : setWaiverOpen(false))}
          onSigned={(waiverPayload) => submitAppointment(waiverPayload, pendingForce)}
          submitting={submitting}
          selectionLabel={selectionLabel}
          selectedPetNames={selectedPetNames}
        />
      )}
    </form>
  );
}
