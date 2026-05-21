import { useEffect, useState } from 'react';
import { Modal, Button, Avatar, Alert, LoadingState } from './ui';
import { getUser } from '../lib/api';

export default function ClientDetailsModal({ open, onClose, clientId, initialClient }) {
  const [fetched, setFetched] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const hasInitial = initialClient && initialClient.id === clientId;

  useEffect(() => {
    if (!open || !clientId || hasInitial) return undefined;
    let cancelled = false;
    setLoading(true);
    setError('');
    setFetched(null);
    getUser(clientId).then((res) => {
      if (cancelled) return;
      setLoading(false);
      if (res?.success) setFetched(res.data);
      else setError(res?.message || 'Failed to load client');
    });
    return () => {
      cancelled = true;
    };
  }, [open, clientId, hasInitial]);

  const client = hasInitial ? initialClient : fetched;

  return (
    <Modal open={open} onClose={onClose} labelledBy="client-details-title">
      <div className="px-5 py-4 border-b border-(--color-border) shrink-0">
        <h2
          id="client-details-title"
          className="text-lg font-semibold text-(--color-foreground)"
        >
          Client Details
        </h2>
      </div>
      <div className="px-5 py-4 overflow-y-auto flex-1 min-h-0 space-y-4">
        {loading && <LoadingState text="Loading client..." />}
        {error && <Alert variant="error">{error}</Alert>}
        {client && (
          <>
            <div className="flex items-center gap-4">
              <Avatar src={client.avatar_url} alt={client.first_name} size="md" />
              <div className="min-w-0">
                <h3 className="text-xl font-semibold text-(--color-foreground) truncate">
                  {client.first_name} {client.last_name}
                </h3>
                {client.role && (
                  <span className="inline-block mt-1 px-2 py-0.5 text-xs rounded-full bg-(--color-secondary) text-(--color-secondary-foreground) capitalize">
                    {client.role}
                  </span>
                )}
              </div>
            </div>
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 text-sm">
              <div className="sm:col-span-2">
                <dt className="text-(--color-muted-foreground) text-xs">Email</dt>
                <dd className="text-(--color-foreground) break-all">{client.email}</dd>
              </div>
              {client.phone_number && (
                <div>
                  <dt className="text-(--color-muted-foreground) text-xs">Phone</dt>
                  <dd className="text-(--color-foreground)">{client.phone_number}</dd>
                </div>
              )}
              {client.address && (
                <div className="sm:col-span-2">
                  <dt className="text-(--color-muted-foreground) text-xs">Address</dt>
                  <dd className="text-(--color-foreground) whitespace-pre-wrap">
                    {client.address}
                  </dd>
                </div>
              )}
            </dl>
          </>
        )}
      </div>
      <div className="px-5 py-4 border-t border-(--color-border) flex justify-end shrink-0 bg-(--color-background)">
        <Button variant="outline" onClick={onClose} className="w-full sm:w-auto">
          Close
        </Button>
      </div>
    </Modal>
  );
}
