import { useEffect, useState } from 'react';
import {
  listWaiverTemplates,
  createWaiverTemplate,
  activateWaiverTemplate,
} from '../lib/api';
import {
  Alert,
  Button,
  Card,
  CardBody,
  CardHeader,
  EmptyState,
  Input,
  Label,
  LoadingState,
  Modal,
} from '../components/ui';
import { Plus, CheckCircle2, Eye } from 'lucide-react';

function formatDate(iso) {
  if (!iso) return '—';
  try {
    return new Date(iso).toLocaleString(undefined, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function WaiverTemplatesPage() {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [createOpen, setCreateOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [createError, setCreateError] = useState('');

  const [previewing, setPreviewing] = useState(null);
  const [activatingId, setActivatingId] = useState(null);

  const reload = async () => {
    setLoading(true);
    setError('');
    const res = await listWaiverTemplates();
    if (res.success) setTemplates(res.data || []);
    else setError(res.message || 'Failed to load templates');
    setLoading(false);
  };

  useEffect(() => {
    reload();
  }, []);

  const openCreate = () => {
    setTitle('');
    setBody('');
    setCreateError('');
    setCreateOpen(true);
  };

  const submitCreate = async (e) => {
    e.preventDefault();
    setCreateError('');
    if (!title.trim() || !body.trim()) {
      setCreateError('Title and body are required');
      return;
    }
    setSubmitting(true);
    const res = await createWaiverTemplate({ title: title.trim(), body });
    setSubmitting(false);
    if (res.success) {
      setCreateOpen(false);
      reload();
    } else {
      setCreateError(res.message || 'Failed to create template');
    }
  };

  const activate = async (id, version) => {
    if (
      !confirm(
        `Activate version ${version}? This deactivates the current active waiver and will be required for all NEW bookings. Existing signed waivers are unchanged.`,
      )
    ) {
      return;
    }
    setActivatingId(id);
    const res = await activateWaiverTemplate(id);
    setActivatingId(null);
    if (res.success) {
      reload();
    } else {
      setError(res.message || 'Failed to activate template');
    }
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-3xl font-bold text-(--color-foreground)">
            Waiver Templates
          </h1>
          <p className="text-sm text-(--color-muted-foreground) mt-1">
            Create new waiver versions. Activating a version requires it on all
            future appointment bookings. Past signed waivers are immutable.
          </p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus size={16} /> New Template
        </Button>
      </div>

      {error && <Alert variant="error">{error}</Alert>}

      <Card>
        <CardHeader title="All Versions" />
        <CardBody>
          {loading ? (
            <LoadingState text="Loading templates..." />
          ) : templates.length === 0 ? (
            <EmptyState message="No waiver templates yet. Create the first one to start collecting signatures." />
          ) : (
            <div className="space-y-3">
              {templates.map((t) => (
                <div
                  key={t.id}
                  className="flex flex-wrap items-start justify-between gap-3 p-4 border border-(--color-border) rounded-lg"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-(--color-foreground)">
                        Version {t.version}
                      </span>
                      {t.is_active && (
                        <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full bg-(--color-primary) text-(--color-primary-foreground)">
                          <CheckCircle2 size={12} /> Active
                        </span>
                      )}
                    </div>
                    <p className="text-sm text-(--color-foreground) mt-1 truncate">
                      {t.title}
                    </p>
                    <p className="text-xs text-(--color-muted-foreground) mt-1">
                      Created {formatDate(t.created_at)}
                      {t.activated_at
                        ? ` · Activated ${formatDate(t.activated_at)}`
                        : ''}
                    </p>
                    <p className="text-[11px] text-(--color-muted-foreground) mt-1 font-mono break-all">
                      sha256: {t.body_sha256}
                    </p>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setPreviewing(t)}
                    >
                      <Eye size={14} /> Preview
                    </Button>
                    {!t.is_active && (
                      <Button
                        size="sm"
                        onClick={() => activate(t.id, t.version)}
                        disabled={activatingId === t.id}
                      >
                        {activatingId === t.id ? 'Activating…' : 'Activate'}
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardBody>
      </Card>

      {/* Create modal */}
      <Modal
        open={createOpen}
        onClose={() => (submitting ? null : setCreateOpen(false))}
        labelledBy="create-template-title"
      >
        <form onSubmit={submitCreate} className="flex flex-col min-h-0 flex-1">
          <div className="px-5 py-4 border-b border-(--color-border) shrink-0">
            <h2
              id="create-template-title"
              className="text-lg font-semibold text-(--color-foreground)"
            >
              New Waiver Template
            </h2>
            <p className="text-sm text-(--color-muted-foreground) mt-1">
              Version number is assigned automatically. The template starts as
              inactive — activate it when ready.
            </p>
          </div>
          <div className="px-5 py-4 overflow-y-auto flex-1 min-h-0 space-y-4">
            {createError && <Alert variant="error">{createError}</Alert>}
            <div>
              <Label htmlFor="template-title">Title</Label>
              <Input
                id="template-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Barista and Paws Liability Waiver"
                required
              />
            </div>
            <div>
              <Label htmlFor="template-body">Body</Label>
              <textarea
                id="template-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                rows={14}
                required
                placeholder="Paste the full waiver text here..."
                className="w-full px-4 py-3 rounded-lg border border-(--color-input) bg-(--color-background) text-(--color-foreground) text-sm focus:outline-none focus:ring-2 focus:ring-(--color-ring) disabled:opacity-60 font-mono"
              />
            </div>
          </div>
          <div className="px-5 py-4 border-t border-(--color-border) flex flex-col-reverse sm:flex-row sm:justify-end gap-3 shrink-0 bg-(--color-background)">
            <Button
              type="button"
              variant="outline"
              onClick={() => setCreateOpen(false)}
              disabled={submitting}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={submitting}
              className="w-full sm:w-auto"
            >
              {submitting ? 'Creating…' : 'Create Template'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Preview modal */}
      <Modal
        open={!!previewing}
        onClose={() => setPreviewing(null)}
        labelledBy="preview-template-title"
      >
        {previewing && (
          <>
            <div className="px-5 py-4 border-b border-(--color-border) shrink-0">
              <h2
                id="preview-template-title"
                className="text-lg font-semibold text-(--color-foreground)"
              >
                {previewing.title}
              </h2>
              <p className="text-sm text-(--color-muted-foreground) mt-1">
                Version {previewing.version}
                {previewing.is_active ? ' · Active' : ''}
              </p>
            </div>
            <div className="px-5 py-4 overflow-y-auto flex-1 min-h-0">
              <div className="border border-(--color-border) rounded-lg p-4 bg-(--color-muted) text-sm whitespace-pre-wrap leading-relaxed">
                {previewing.body}
              </div>
            </div>
            <div className="px-5 py-4 border-t border-(--color-border) flex justify-end shrink-0 bg-(--color-background)">
              <Button
                variant="outline"
                onClick={() => setPreviewing(null)}
                className="w-full sm:w-auto"
              >
                Close
              </Button>
            </div>
          </>
        )}
      </Modal>
    </div>
  );
}
