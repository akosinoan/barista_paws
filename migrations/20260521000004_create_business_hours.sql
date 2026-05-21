CREATE TABLE business_hours (
    id              SMALLINT PRIMARY KEY DEFAULT 1 CHECK (id = 1),
    open_time       TIME NOT NULL,
    close_time      TIME NOT NULL,
    slot_minutes    INTEGER NOT NULL CHECK (slot_minutes > 0 AND slot_minutes <= 240),
    updated_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CHECK (open_time < close_time)
);

INSERT INTO business_hours (id, open_time, close_time, slot_minutes)
VALUES (1, '09:00', '18:00', 30);
