CREATE TABLE audit_logs (
    id              BIGSERIAL PRIMARY KEY,
    actor_user_id   UUID REFERENCES users(id),
    actor_role      TEXT,
    action          TEXT NOT NULL,
    target_type     TEXT,
    target_id       TEXT,
    metadata        JSONB NOT NULL DEFAULT '{}'::jsonb,
    ip_address      TEXT,
    user_agent      TEXT,
    created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX audit_logs_actor_idx       ON audit_logs (actor_user_id, created_at DESC);
CREATE INDEX audit_logs_target_idx      ON audit_logs (target_type, target_id);
CREATE INDEX audit_logs_action_idx      ON audit_logs (action, created_at DESC);
CREATE INDEX audit_logs_metadata_gin    ON audit_logs USING GIN (metadata);

CREATE OR REPLACE FUNCTION forbid_audit_log_mutation() RETURNS trigger AS $$
BEGIN
    RAISE EXCEPTION 'audit_logs is append-only.';
END $$ LANGUAGE plpgsql;

CREATE TRIGGER audit_logs_no_update BEFORE UPDATE ON audit_logs
    FOR EACH ROW EXECUTE FUNCTION forbid_audit_log_mutation();
CREATE TRIGGER audit_logs_no_delete BEFORE DELETE ON audit_logs
    FOR EACH ROW EXECUTE FUNCTION forbid_audit_log_mutation();
