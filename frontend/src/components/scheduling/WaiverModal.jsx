import { useEffect, useMemo, useRef, useState } from 'react';
import { getActiveWaiver } from '../../lib/api';
import { Alert, Button, Label, Modal } from '../ui';

export default function WaiverModal({
  open,
  onClose,
  onSigned,
  submitting,
  selectionLabel,
  selectedPetNames,
}) {
  const [template, setTemplate] = useState(null);
  const [loadError, setLoadError] = useState('');
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const [consent, setConsent] = useState(false);
  const [fullName, setFullName] = useState('');
  const sentinelRef = useRef(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (!open) return;
    setLoadError('');
    setTemplate(null);
    setScrolledToBottom(false);
    setConsent(false);
    setFullName('');
    getActiveWaiver().then((res) => {
      if (res?.success) setTemplate(res.data);
      else setLoadError(res?.message || 'Failed to load waiver');
    });
  }, [open]);

  useEffect(() => {
    if (!open || !template) return undefined;
    const sentinel = sentinelRef.current;
    const root = scrollRef.current;
    if (!sentinel || !root) return undefined;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries.some((e) => e.isIntersecting)) setScrolledToBottom(true);
      },
      { root, threshold: 0.99 },
    );
    io.observe(sentinel);
    // If the body is short enough that no scrolling is needed, unlock immediately.
    if (root.scrollHeight <= root.clientHeight + 4) setScrolledToBottom(true);
    return () => io.disconnect();
  }, [open, template]);

  const canSubmit = useMemo(
    () =>
      !!template &&
      scrolledToBottom &&
      consent &&
      fullName.trim().length >= 2 &&
      !submitting,
    [template, scrolledToBottom, consent, fullName, submitting],
  );

  const handleSign = () => {
    if (!canSubmit) return;
    onSigned({
      template_id: template.id,
      template_version: template.version,
      waiver_body_sha256: template.body_sha256,
      signer_full_name: fullName.trim(),
      consent_checked: true,
      client_timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
    });
  };

  return (
    <Modal open={open} onClose={onClose} labelledBy="waiver-modal-title">
      <div className="px-5 py-4 border-b border-(--color-border) shrink-0">
        <h2
          id="waiver-modal-title"
          className="text-lg font-semibold text-(--color-foreground)"
        >
          Liability Waiver
          {template && (
            <span className="ml-2 text-sm text-(--color-muted-foreground) font-normal">
              Version {template.version}
            </span>
          )}
        </h2>
        {(selectionLabel || selectedPetNames?.length) && (
          <p className="mt-1 text-sm text-(--color-muted-foreground)">
            {selectedPetNames?.length ? (
              <>
                Pets: <span className="font-medium">{selectedPetNames.join(', ')}</span>
                {selectionLabel ? ' · ' : ''}
              </>
            ) : null}
            {selectionLabel}
          </p>
        )}
      </div>

      <div className="px-5 py-4 overflow-hidden flex-1 flex flex-col min-h-0">
        {loadError && <Alert variant="error">{loadError}</Alert>}
        {!template && !loadError && (
          <p className="text-sm text-(--color-muted-foreground)">Loading waiver…</p>
        )}
        {template && (
          <div
            ref={scrollRef}
            aria-label="Waiver text — scroll to read fully"
            className="flex-1 overflow-y-auto border border-(--color-border) rounded-lg p-4 bg-(--color-muted) text-sm whitespace-pre-wrap leading-relaxed"
            tabIndex={0}
          >
            {template.body}
            <div ref={sentinelRef} aria-hidden="true" style={{ height: 1 }} />
          </div>
        )}
        {template && !scrolledToBottom && (
          <p className="mt-2 text-xs text-(--color-muted-foreground)">
            Please scroll to the end of the waiver to continue.
          </p>
        )}
      </div>

      <div className="px-5 py-4 border-t border-(--color-border) space-y-3 shrink-0 bg-(--color-background) sticky bottom-0">
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="checkbox"
            checked={consent}
            disabled={!scrolledToBottom}
            onChange={(e) => setConsent(e.target.checked)}
            className="mt-1 w-5 h-5 accent-(--color-primary) cursor-pointer shrink-0 disabled:cursor-not-allowed"
          />
          <span className="text-sm text-(--color-foreground)">
            I have read and agree to the waiver above.
          </span>
        </label>

        <div>
          <Label htmlFor="waiver-full-name" className="mb-1.5 block text-sm">
            Type your full legal name to sign *
          </Label>
          <input
            id="waiver-full-name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            disabled={!consent}
            autoComplete="name"
            className="w-full px-4 py-3 rounded-lg border border-(--color-input) bg-(--color-background) text-(--color-foreground) text-base focus:outline-none focus:ring-2 focus:ring-(--color-ring) disabled:opacity-60"
          />
        </div>

        <div className="flex flex-col-reverse sm:flex-row gap-3 sm:justify-end pt-1">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={submitting}
            className="w-full sm:w-auto py-3 text-base sm:py-2 sm:text-sm"
          >
            Cancel
          </Button>
          <Button
            type="button"
            onClick={handleSign}
            disabled={!canSubmit}
            className="w-full sm:w-auto py-3 text-base sm:py-2 sm:text-sm"
          >
            {submitting ? 'Submitting…' : 'Sign & Submit Appointment'}
          </Button>
        </div>
      </div>
    </Modal>
  );
}
