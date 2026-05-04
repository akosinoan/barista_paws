import { CalendarClock, Trash2, Check, X, CheckCheck } from 'lucide-react';
import { Button } from './ui';

const STATUS_STYLES = {
  pending: 'bg-(--color-muted) text-(--color-muted-foreground)',
  approved: 'bg-(--color-primary) text-(--color-primary-foreground)',
  completed: 'bg-green-500/15 text-green-700 dark:text-green-400',
  rejected: 'bg-(--color-destructive)/15 text-(--color-destructive)',
  cancelled: 'bg-(--color-destructive)/15 text-(--color-destructive)',
};

function formatDate(iso) {
  try {
    const d = new Date(`${iso}T00:00:00`);
    return d.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return iso;
  }
}

function formatTime(t) {
  return (t || '').slice(0, 5);
}

export default function AppointmentCard({
  appointment,
  clientName,
  onCancel,
  onApprove,
  onReject,
  onComplete,
}) {
  const { id, appointment_date, time_slot, status, notes, pets } = appointment;

  return (
    <div className="border border-(--color-border) rounded-lg bg-(--color-card) text-(--color-card-foreground) p-4">
      <div className="flex justify-between items-start gap-3">
        <div className="flex items-start gap-3">
          <div className="mt-0.5 shrink-0 p-2 rounded-lg bg-(--color-muted) text-(--color-muted-foreground)">
            <CalendarClock size={18} />
          </div>
          <div>
            <p className="font-semibold text-(--color-foreground)">
              {formatDate(appointment_date)} · {formatTime(time_slot)}
            </p>
            {clientName && (
              <p className="text-xs text-(--color-muted-foreground) mt-0.5">
                Client: {clientName}
              </p>
            )}
          </div>
        </div>
        <span
          className={`text-xs px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[status] || STATUS_STYLES.pending}`}
        >
          {status}
        </span>
      </div>

      {pets && pets.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {pets.map((pet) => (
            <span
              key={pet.id}
              className="text-xs px-2 py-0.5 rounded-full bg-(--color-secondary) text-(--color-secondary-foreground)"
            >
              🐾 {pet.name}
            </span>
          ))}
        </div>
      )}

      {notes && (
        <p className="mt-3 text-sm text-(--color-muted-foreground) italic">{notes}</p>
      )}

      {(onCancel || onApprove || onReject || onComplete) && (
        <div className="mt-3 pt-3 border-t border-(--color-border) flex flex-wrap gap-2 justify-end">
          {onApprove && status === 'pending' && (
            <Button size="sm" variant="outline" onClick={() => onApprove(id)}>
              <Check size={14} /> Approve
            </Button>
          )}
          {onReject && status === 'pending' && (
            <Button size="sm" variant="destructive" onClick={() => onReject(id)}>
              <X size={14} /> Reject
            </Button>
          )}
          {onComplete && status === 'approved' && (
            <Button size="sm" variant="outline" onClick={() => onComplete(id)}>
              <CheckCheck size={14} /> Mark Complete
            </Button>
          )}
          {onCancel && (status === 'pending' || status === 'approved') && (
            <Button size="sm" variant="destructive" onClick={() => onCancel(id)}>
              <Trash2 size={14} /> Cancel
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
