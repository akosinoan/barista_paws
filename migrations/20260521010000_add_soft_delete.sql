-- Add soft-delete support for entities that may need to preserve referential history.
-- users are intentionally excluded: per delete policy, users with pets/appointments
-- are blocked from deletion entirely, otherwise hard-deleted.

ALTER TABLE pets         ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE appointments ADD COLUMN deleted_at TIMESTAMPTZ;
ALTER TABLE images       ADD COLUMN deleted_at TIMESTAMPTZ;

CREATE INDEX idx_pets_active         ON pets(id)         WHERE deleted_at IS NULL;
CREATE INDEX idx_appointments_active ON appointments(id) WHERE deleted_at IS NULL;
CREATE INDEX idx_images_active       ON images(id)       WHERE deleted_at IS NULL;
