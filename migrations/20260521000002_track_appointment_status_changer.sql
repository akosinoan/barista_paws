ALTER TABLE appointments
    ADD COLUMN status_changed_by UUID NULL REFERENCES users(id) ON DELETE SET NULL,
    ADD COLUMN status_changed_at TIMESTAMP WITH TIME ZONE NULL;
