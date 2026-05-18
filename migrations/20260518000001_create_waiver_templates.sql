CREATE TABLE waiver_templates (
    id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    version         INTEGER NOT NULL,
    title           TEXT NOT NULL,
    body            TEXT NOT NULL,
    body_sha256     CHAR(64) NOT NULL,
    is_active       BOOLEAN NOT NULL DEFAULT FALSE,
    activated_at    TIMESTAMPTZ,
    created_by      UUID NOT NULL REFERENCES users(id),
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    CONSTRAINT waiver_templates_version_unique UNIQUE (version)
);

CREATE UNIQUE INDEX waiver_templates_one_active
    ON waiver_templates ((TRUE)) WHERE is_active;

CREATE INDEX waiver_templates_active_idx
    ON waiver_templates (is_active, activated_at DESC);

CREATE OR REPLACE FUNCTION forbid_template_mutation() RETURNS trigger AS $$
BEGIN
    IF OLD.is_active AND (NEW.body <> OLD.body OR NEW.body_sha256 <> OLD.body_sha256) THEN
        RAISE EXCEPTION 'Cannot modify body of an activated waiver template (id=%).', OLD.id;
    END IF;
    RETURN NEW;
END $$ LANGUAGE plpgsql;

CREATE TRIGGER waiver_templates_immutable
    BEFORE UPDATE ON waiver_templates
    FOR EACH ROW EXECUTE FUNCTION forbid_template_mutation();
