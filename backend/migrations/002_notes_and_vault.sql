CREATE TABLE IF NOT EXISTS notes (
    id          BIGSERIAL PRIMARY KEY,
    title       TEXT NOT NULL,
    content     TEXT NOT NULL,
    created_by  INT8 REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ DEFAULT NOW(),
    updated_at  TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS vaults (
    id          BIGSERIAL PRIMARY KEY,
    service_name TEXT NOT NULL,
    url TEXT,
    username  TEXT NOT NULL,
    password_encrypted  TEXT NOT NULL,
    created_by  INT8 REFERENCES users(id) ON DELETE CASCADE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);