CREATE TABLE staff (
  id UUID PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('superadmin','manager')),
  password_hash TEXT,
  active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE sessions (
  token_hash TEXT PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES staff(id),
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE INDEX sessions_expiry ON sessions(expires_at);
CREATE TABLE activations (
  token_hash TEXT PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES staff(id),
  expires_at TIMESTAMPTZ NOT NULL
);
CREATE TABLE messages (
  id UUID PRIMARY KEY,
  request_id UUID UNIQUE NOT NULL,
  nickname TEXT NOT NULL DEFAULT '',
  state TEXT NOT NULL DEFAULT '',
  needs JSONB NOT NULL DEFAULT '[]',
  words TEXT NOT NULL DEFAULT '',
  avoid TEXT NOT NULL DEFAULT '',
  contact TEXT NOT NULL DEFAULT '',
  wants_contact BOOLEAN NOT NULL,
  privacy_version TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','contacted','accompanying','closed')),
  assignee_id UUID REFERENCES staff(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  contacted_at TIMESTAMPTZ,
  revision INTEGER NOT NULL DEFAULT 1
);
CREATE INDEX messages_created ON messages(created_at DESC, id DESC);
CREATE TABLE notes (
  id UUID PRIMARY KEY,
  message_id UUID NOT NULL REFERENCES messages(id) ON DELETE CASCADE,
  staff_id UUID NOT NULL REFERENCES staff(id),
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE audit (
  id UUID PRIMARY KEY,
  staff_id UUID NOT NULL REFERENCES staff(id),
  action TEXT NOT NULL,
  target_id UUID NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL
);
