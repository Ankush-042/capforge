-- Migration 006: Connections + Team Formation (Sprint 5)
-- Ref: Architecture doc §34-37, App Flow §4.8-4.9, SRS §43-48
-- THIS IS THE SPRINT THAT CLOSES THE CORE PROPAGATION LOOP (TRD Rule 3):
-- connection accepted -> team updated -> gaps recalculated -> readiness
-- recalculated. Nothing here is a disconnected module.

CREATE TYPE connection_type AS ENUM ('FOUNDER_CONTRIBUTOR', 'FOUNDER_INVESTOR');
CREATE TYPE connection_status AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED', 'CANCELLED');

CREATE TABLE connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  receiver_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  startup_id UUID NOT NULL REFERENCES startups(id) ON DELETE CASCADE,
  source_gap_id UUID REFERENCES gaps(id) ON DELETE SET NULL,
  type connection_type NOT NULL DEFAULT 'FOUNDER_CONTRIBUTOR',
  message TEXT,
  status connection_status NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),

  CONSTRAINT no_self_connection CHECK (sender_id != receiver_id)
);

-- SRS §45: prevent duplicate pending requests between the same two people
-- for the same startup — enforced at the database level, not just app logic.
CREATE UNIQUE INDEX idx_unique_pending_connection
  ON connections (sender_id, receiver_id, startup_id)
  WHERE status = 'PENDING';

CREATE INDEX idx_connections_sender ON connections(sender_id);
CREATE INDEX idx_connections_receiver ON connections(receiver_id);
CREATE INDEX idx_connections_startup ON connections(startup_id);
