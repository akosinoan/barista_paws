CREATE TABLE signed_waivers (
    id                  UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id      UUID NOT NULL UNIQUE REFERENCES appointments(id) ON DELETE RESTRICT,
    user_id             UUID NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
    template_id         UUID NOT NULL REFERENCES waiver_templates(id),
    template_version    INTEGER NOT NULL,

    waiver_body         TEXT NOT NULL,
    waiver_body_sha256  CHAR(64) NOT NULL,

    signer_full_name    TEXT NOT NULL,
    consent_checked     BOOLEAN NOT NULL,
    pet_ids             UUID[] NOT NULL,
    service_notes       TEXT,

    signed_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    client_ip           TEXT NOT NULL,
    user_agent          TEXT NOT NULL,
    client_timezone     TEXT NOT NULL,

    payload_sha256      CHAR(64) NOT NULL,

    created_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    CONSTRAINT signed_waivers_consent_true CHECK (consent_checked = TRUE),
    CONSTRAINT signed_waivers_name_nonblank CHECK (length(btrim(signer_full_name)) >= 2)
);

CREATE INDEX signed_waivers_user_idx        ON signed_waivers (user_id, signed_at DESC);
CREATE INDEX signed_waivers_template_idx    ON signed_waivers (template_id);
CREATE INDEX signed_waivers_signed_at_idx   ON signed_waivers (signed_at DESC);

CREATE OR REPLACE FUNCTION forbid_signed_waiver_mutation() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'signed_waivers is append-only (id=%).', COALESCE(OLD.id, NEW.id);
END $$ LANGUAGE plpgsql;

CREATE TRIGGER signed_waivers_no_update
    BEFORE UPDATE ON signed_waivers
    FOR EACH ROW EXECUTE FUNCTION forbid_signed_waiver_mutation();

CREATE TRIGGER signed_waivers_no_delete
    BEFORE DELETE ON signed_waivers
    FOR EACH ROW EXECUTE FUNCTION forbid_signed_waiver_mutation();
