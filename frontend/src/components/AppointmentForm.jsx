import { useState, useEffect } from 'react';
import { getPetsByOwner, getAvailableTimeslots } from '../lib/api';
import { Button, Label, Alert, RadioGroup, DateField } from './ui';
import { todayIso } from '../lib/utils';

const PERIOD_OPTIONS = [
  { value: 'AM', label: 'AM' },
  { value: 'PM', label: 'PM' },
];

function slotHour(t) {
  return parseInt(t.slice(0, 2), 10);
}

function formatSlot12(t) {
  const h = slotHour(t);
  const m = t.slice(3, 5);
  const h12 = h % 12 === 0 ? 12 : h % 12;
  return `${h12}:${m}`;
}

const FIELD_CLASS =
  'w-full px-4 py-3 rounded-lg border border-(--color-input) bg-(--color-background) text-(--color-foreground) text-base focus:outline-none focus:ring-2 focus:ring-(--color-ring) disabled:opacity-60';

export default function AppointmentForm({ ownerId, onSubmit, onCancel, allowOverride = false }) {
  const [pets, setPets] = useState([]);
  const [selectedPets, setSelectedPets] = useState([]);
  const [date, setDate] = useState('');
  const [period, setPeriod] = useState('AM');
  const [slot, setSlot] = useState('');
  const [notes, setNotes] = useState('');
  const [availability, setAvailability] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getPetsByOwner(ownerId).then((res) => {
      if (res.success) setPets(res.data || []);
    });
  }, [ownerId]);

  useEffect(() => {
    if (!date) {
      setAvailability([]);
      return;
    }
    setLoadingSlots(true);
    setSlot('');
    getAvailableTimeslots(date).then((res) => {
      if (res.success) setAvailability(res.data || []);
      setLoadingSlots(false);
    });
  }, [date]);

  const togglePet = (petId) => {
    setSelectedPets((cur) =>
      cur.includes(petId) ? cur.filter((id) => id !== petId) : [...cur, petId],
    );
  };

  const slotMeta = availability.find((a) => a.time_slot === slot);
  const isSlotBlocked = !!(slot && slotMeta && slotMeta.available === false);
  const needsOverrideConfirm = allowOverride && isSlotBlocked;

  const submitAppointment = async (force) => {
    setSubmitting(true);
    const res = await onSubmit({
      appointment_date: date,
      time_slot: slot.length === 5 ? `${slot}:00` : slot,
      pet_ids: selectedPets,
      notes: notes || null,
      force,
    });
    setSubmitting(false);
    if (res && res.success === false) {
      setError(res.message || 'Failed to create appointment');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!date || !slot) {
      setError('Please select a date and timeslot');
      return;
    }
    if (selectedPets.length === 0) {
      setError('Please select at least one pet');
      return;
    }
    if (isSlotBlocked && !allowOverride) {
      setError('Selected timeslot is unavailable');
      return;
    }
    if (needsOverrideConfirm) return;
    await submitAppointment(false);
  };

  const handleConfirmOverride = async () => {
    setError('');
    if (selectedPets.length === 0) {
      setError('Please select at least one pet');
      return;
    }
    await submitAppointment(true);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {error && <Alert variant="error">{error}</Alert>}

      <div>
        <Label className="mb-1.5 block text-sm">Date *</Label>
        <DateField value={date} onChange={setDate} min={todayIso()} required />
      </div>

      <div>
        <Label className="mb-1.5 block text-sm">Timeslot *</Label>
        <RadioGroup
          name="period"
          value={period}
          onChange={(p) => {
            setPeriod(p);
            setSlot('');
          }}
          options={PERIOD_OPTIONS}
          className="mb-3"
        />
        <select
          value={slot}
          onChange={(e) => setSlot(e.target.value)}
          disabled={!date || loadingSlots}
          required
          className={FIELD_CLASS}
        >
          <option value="">
            {!date
              ? 'Select a date first'
              : loadingSlots
                ? 'Loading slots...'
                : `Choose a ${period} timeslot`}
          </option>
          {availability
            .filter((a) => (period === 'AM' ? slotHour(a.time_slot) < 12 : slotHour(a.time_slot) >= 12))
            .map((a) => (
              <option
                key={a.time_slot}
                value={a.time_slot}
                disabled={!a.available && !allowOverride}
              >
                {formatSlot12(a.time_slot)} {period}
                {!a.available ? ' (blocked)' : ''}
              </option>
            ))}
        </select>
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
            {submitting ? 'Submitting...' : 'Request Appointment'}
          </Button>
        )}
      </div>
    </form>
  );
}
