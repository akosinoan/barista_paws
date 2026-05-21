CREATE TABLE images (
    id UUID PRIMARY KEY,
    bytes BYTEA NOT NULL,
    content_type TEXT NOT NULL,
    byte_size INTEGER NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE users
    DROP COLUMN avatar_url,
    ADD COLUMN avatar_image_id UUID NULL REFERENCES images(id) ON DELETE SET NULL;

ALTER TABLE pets
    DROP COLUMN photo_url,
    ADD COLUMN photo_image_id UUID NULL REFERENCES images(id) ON DELETE SET NULL;
