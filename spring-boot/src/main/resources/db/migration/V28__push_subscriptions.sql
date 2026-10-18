-- Abonnements Web Push (VAPID) — iOS PWA installée + Android Chrome / desktop.

CREATE TABLE push_subscriptions (
    id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id      UUID         NOT NULL REFERENCES users (id) ON DELETE CASCADE,
    endpoint     TEXT         NOT NULL,
    p256dh       TEXT         NOT NULL,
    auth         TEXT         NOT NULL,
    user_agent   TEXT,
    created_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    updated_at   TIMESTAMPTZ  NOT NULL DEFAULT NOW(),
    CONSTRAINT uq_push_subscriptions_endpoint UNIQUE (endpoint)
);

CREATE INDEX idx_push_subscriptions_user ON push_subscriptions (user_id);

DO $$
BEGIN
  ALTER TABLE public.push_subscriptions ENABLE ROW LEVEL SECURITY;
  ALTER TABLE public.push_subscriptions FORCE ROW LEVEL SECURITY;
  DROP POLICY IF EXISTS yee_api_all ON public.push_subscriptions;
  CREATE POLICY yee_api_all ON public.push_subscriptions
    FOR ALL TO yee_api USING (true) WITH CHECK (true);
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.push_subscriptions TO yee_api;
END $$;
