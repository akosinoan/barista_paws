import { useState } from 'react';
import {
  CalendarClock,
  Trash2,
  Check,
  X,
  CheckCheck,
  FileSignature,
  AlertTriangle,
} from 'lucide-react';
import { Alert, Button, Modal } from './ui';
import { getSignedWaiver, signAppointmentWaiver } from '../lib/api';
import { useAuth } from '../lib/AuthContext';
import WaiverModal from './scheduling/WaiverModal';

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

function formatTimestamp(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return iso;
  }
}

export default function AppointmentCard({
  appointment,
  clientName,
  onCancel,
  onApprove,
  onReject,
  onComplete,
  onUpdated,
}) {
  const {
    id,
    appointment_date,
    time_slot,
    status,
    notes,
    pets,
    client_id,
    waiver_signed,
  } = appointment;

  const { user, isAdmin } = useAuth();
  const isOwner = user?.id === client_id;

  const [waiverOpen, setWaiverOpen] = useState(false);
  const [waiver, setWaiver] = useState(null);
  const [waiverLoading, setWaiverLoading] = useState(false);
  const [waiverError, setWaiverError] = useState('');

  const [signOpen, setSignOpen] = useState(false);
  const [signing, setSigning] = useState(false);
  const [signError, setSignError] = useState('');

  const petLabels = (pets || []).map((p) => p.name);

  const handleSign = async (payload) => {
    setSigning(true);
    setSignError('');
    const res = await signAppointmentWaiver(id, payload);
    setSigning(false);
    if (res?.success) {
      setSignOpen(false);
      onUpdated?.(res.data);
    } else {
      setSignError(res?.message || 'Failed to sign waiver');
    }
  };

  const openWaiver = async () => {
    setWaiverOpen(true);
    setWaiverError('');
    if (waiver) return;
    setWaiverLoading(true);
    const res = await getSignedWaiver(id);
    setWaiverLoading(false);
    if (res?.success) setWaiver(res.data);
    else setWaiverError(res?.message || 'Failed to load signed waiver');
  };

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

      {!waiver_signed && (
        <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-medium px-2 py-1 rounded-md bg-(--color-destructive)/10 text-(--color-destructive)">
          <AlertTriangle size={12} />
          {isOwner ? 'Waiver not yet signed' : 'Awaiting client waiver'}
        </div>
      )}
      {signError && (
        <div className="mt-3">
          <Alert variant="error">{signError}</Alert>
        </div>
      )}

      <div className="mt-3 pt-3 border-t border-(--color-border) flex flex-wrap gap-2 justify-between items-center">
        {waiver_signed ? (
          <button
            type="button"
            onClick={openWaiver}
            className="inline-flex items-center gap-1 text-xs text-(--color-primary) hover:underline cursor-pointer"
          >
            <FileSignature size={14} /> View signed waiver
          </button>
        ) : isOwner ? (
          <Button size="sm" onClick={() => setSignOpen(true)}>
            <FileSignature size={14} /> Sign Waiver
          </Button>
        ) : (
          <span className="text-xs text-(--color-muted-foreground)">
            Waiver required from client before service
          </span>
        )}
        <div className="flex flex-wrap gap-2 justify-end">
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
      </div>

      <Modal
        open={waiverOpen}
        onClose={() => setWaiverOpen(false)}
        labelledBy={`waiver-view-title-${id}`}
      >
        <div className="px-5 py-4 border-b border-(--color-border) shrink-0">
          <h2
            id={`waiver-view-title-${id}`}
            className="text-lg font-semibold text-(--color-foreground)"
          >
            Signed Waiver
          </h2>
          {waiver && (
            <p className="text-sm text-(--color-muted-foreground) mt-1">
              Version {waiver.template_version} · Signed{' '}
              {formatTimestamp(waiver.signed_at)}
            </p>
          )}
        </div>
        <div className="px-5 py-4 overflow-y-auto flex-1 min-h-0 space-y-5">
          {waiverLoading && (
            <p className="text-sm text-(--color-muted-foreground)">Loading…</p>
          )}
          {waiverError && <Alert variant="error">{waiverError}</Alert>}
          {waiver && (
            <>
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-(--color-muted-foreground) mb-2">
                  Appointment
                </h3>
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm">
                  <div>
                    <dt className="text-(--color-muted-foreground) text-xs">
                      Date
                    </dt>
                    <dd className="font-medium text-(--color-foreground)">
                      {formatDate(appointment_date)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-(--color-muted-foreground) text-xs">
                      Time
                    </dt>
                    <dd className="font-medium text-(--color-foreground)">
                      {formatTime(time_slot)}
                    </dd>
                  </div>
                  {clientName && (
                    <div className="sm:col-span-2">
                      <dt className="text-(--color-muted-foreground) text-xs">
                        Client
                      </dt>
                      <dd className="text-(--color-foreground)">{clientName}</dd>
                    </div>
                  )}
                  <div className="sm:col-span-2">
                    <dt className="text-(--color-muted-foreground) text-xs">
                      Pets {pets && pets.length > 0 && `(${pets.length})`}
                    </dt>
                    <dd className="mt-1 flex flex-wrap gap-1.5">
                      {pets && pets.length > 0 ? (
                        pets.map((pet) => (
                          <span
                            key={pet.id}
                            className="text-xs px-2 py-0.5 rounded-full bg-(--color-secondary) text-(--color-secondary-foreground)"
                          >
                            🐾 {pet.name}
                            {pet.species ? (
                              <span className="ml-1 text-(--color-muted-foreground)">
                                · {pet.species}
                              </span>
                            ) : null}
                          </span>
                        ))
                      ) : (
                        <span className="text-(--color-muted-foreground) text-sm">
                          —
                        </span>
                      )}
                    </dd>
                  </div>
                  {(notes || waiver.service_notes) && (
                    <div className="sm:col-span-2">
                      <dt className="text-(--color-muted-foreground) text-xs">
                        Notes
                      </dt>
                      <dd className="text-(--color-foreground) text-sm italic whitespace-pre-wrap">
                        {waiver.service_notes || notes}
                      </dd>
                    </div>
                  )}
                </dl>
              </section>

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-(--color-muted-foreground) mb-2">
                  Signature evidence
                </h3>
                <dl className="grid grid-cols-1 gap-y-2 text-sm">
                  <div>
                    <dt className="text-(--color-muted-foreground) text-xs">
                      Signed by
                    </dt>
                    <dd className="font-medium text-(--color-foreground)">
                      {waiver.signer_full_name}
                    </dd>
                  </div>
                </dl>

                <details className="mt-3 group">
                  <summary className="cursor-pointer list-none inline-flex items-center gap-1 text-xs font-medium text-(--color-primary) hover:underline">
                    <span className="group-open:hidden">Show details</span>
                    <span className="hidden group-open:inline">Hide details</span>
                    <span aria-hidden="true" className="transition-transform group-open:rotate-180">
                      ▾
                    </span>
                  </summary>
                  <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2 text-sm mt-3 pl-3 border-l-2 border-(--color-border)">
                    <div>
                      <dt className="text-(--color-muted-foreground) text-xs">
                        Consent
                      </dt>
                      <dd className="font-medium text-(--color-foreground)">
                        {waiver.consent_checked ? 'Yes' : 'No'}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-(--color-muted-foreground) text-xs">
                        Waiver version
                      </dt>
                      <dd className="text-(--color-foreground)">
                        v{waiver.template_version}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-(--color-muted-foreground) text-xs">
                        Signed at
                      </dt>
                      <dd className="text-(--color-foreground)">
                        {formatTimestamp(waiver.signed_at)}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-(--color-muted-foreground) text-xs">
                        Timezone
                      </dt>
                      <dd className="text-(--color-foreground)">
                        {waiver.client_timezone}
                      </dd>
                    </div>
                    <div>
                      <dt className="text-(--color-muted-foreground) text-xs">
                        IP address
                      </dt>
                      <dd className="font-mono text-xs text-(--color-foreground)">
                        {waiver.client_ip}
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-(--color-muted-foreground) text-xs">
                        User agent
                      </dt>
                      <dd className="text-xs text-(--color-foreground) break-words">
                        {waiver.user_agent}
                      </dd>
                    </div>
                    <div className="sm:col-span-2">
                      <dt className="text-(--color-muted-foreground) text-xs">
                        Payload SHA-256
                      </dt>
                      <dd className="font-mono text-[11px] text-(--color-foreground) break-all">
                        {waiver.payload_sha256}
                      </dd>
                    </div>
                  </dl>
                </details>
              </section>

              <section>
                <h3 className="text-xs font-semibold uppercase tracking-wide text-(--color-muted-foreground) mb-2">
                  Waiver text snapshot
                </h3>
                <div className="border border-(--color-border) rounded-lg p-4 bg-(--color-muted) text-sm whitespace-pre-wrap leading-relaxed">
                  {waiver.waiver_body}
                </div>
              </section>
            </>
          )}
        </div>
        <div className="px-5 py-4 border-t border-(--color-border) flex justify-end shrink-0 bg-(--color-background)">
          <Button
            variant="outline"
            onClick={() => setWaiverOpen(false)}
            className="w-full sm:w-auto"
          >
            Close
          </Button>
        </div>
      </Modal>

      {isOwner && !waiver_signed && (
        <WaiverModal
          open={signOpen}
          onClose={() => (signing ? null : setSignOpen(false))}
          onSigned={handleSign}
          submitting={signing}
          selectionLabel={`${formatDate(appointment_date)} · ${formatTime(time_slot)}`}
          selectedPetNames={petLabels}
        />
      )}
    </div>
  );
}
