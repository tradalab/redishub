-- RedisHub schema
-- Used by: scorix generate model -d ./redishub

CREATE TABLE IF NOT EXISTS "connection" (
    id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    mode             TEXT NOT NULL DEFAULT 'standalone',
    name             TEXT NOT NULL DEFAULT '',
    network          TEXT NOT NULL DEFAULT 'tcp',
    host             TEXT NOT NULL DEFAULT '',
    port             INTEGER NOT NULL DEFAULT 6379,
    addrs            TEXT NOT NULL DEFAULT '',
    sentinel_master  TEXT NOT NULL DEFAULT '',
    sentinel_username TEXT NOT NULL DEFAULT '',
    sentinel_password TEXT NOT NULL DEFAULT '',
    sock             TEXT NOT NULL DEFAULT '',
    username         TEXT NOT NULL DEFAULT '',
    password         TEXT NOT NULL DEFAULT '',
    addr_mapping     TEXT NOT NULL DEFAULT '',
    last_db          INTEGER NOT NULL DEFAULT 0,
    exec_timeout     INTEGER NOT NULL DEFAULT 60,
    dial_timeout     INTEGER NOT NULL DEFAULT 60,
    key_size         INTEGER NOT NULL DEFAULT 10000,
    group_id         TEXT NOT NULL DEFAULT '',
    ssh_enable       INTEGER NOT NULL DEFAULT 0,
    ssh_id           TEXT NOT NULL DEFAULT '',
    proxy_enable     INTEGER NOT NULL DEFAULT 0,
    proxy_id         TEXT NOT NULL DEFAULT '',
    tls_enable       INTEGER NOT NULL DEFAULT 0,
    tls_id           TEXT NOT NULL DEFAULT '',
    read_only        INTEGER NOT NULL DEFAULT 0,
    created_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at       DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    deleted_at       DATETIME
);

CREATE TABLE IF NOT EXISTS "ssh" (
    id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    host        TEXT NOT NULL DEFAULT '',
    port        INTEGER NOT NULL DEFAULT 22,
    username    TEXT NOT NULL DEFAULT '',
    kind        TEXT NOT NULL DEFAULT 'password',
    password    TEXT NOT NULL DEFAULT '',
    private_key TEXT NOT NULL DEFAULT '',
    passphrase  TEXT NOT NULL DEFAULT '',
    timeout     INTEGER NOT NULL DEFAULT 60,
    created_at  DATETIME,
    updated_at  DATETIME,
    deleted_at  DATETIME
);

CREATE TABLE IF NOT EXISTS "tls" (
    id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    name        TEXT NOT NULL DEFAULT '',
    use_sni     INTEGER NOT NULL DEFAULT 0,
    server_name TEXT NOT NULL DEFAULT '',
    verify      INTEGER NOT NULL DEFAULT 1,
    client_auth INTEGER NOT NULL DEFAULT 0,
    ca_cert     TEXT NOT NULL DEFAULT '',
    cert        TEXT NOT NULL DEFAULT '',
    key         TEXT NOT NULL DEFAULT '',
    created_at  DATETIME,
    updated_at  DATETIME,
    deleted_at  DATETIME
);

CREATE TABLE IF NOT EXISTS proxy (
    id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    protocol    TEXT NOT NULL DEFAULT 'http',
    host        TEXT NOT NULL DEFAULT '',
    port        INTEGER NOT NULL DEFAULT 0,
    username    TEXT NOT NULL DEFAULT '',
    password    TEXT NOT NULL DEFAULT '',
    created_at  DATETIME,
    updated_at  DATETIME,
    deleted_at  DATETIME
);

CREATE TABLE IF NOT EXISTS "group" (
    id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    name        TEXT NOT NULL DEFAULT '',
    created_at  DATETIME,
    updated_at  DATETIME,
    deleted_at  DATETIME
);

CREATE TABLE IF NOT EXISTS "setting" (
    id          TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(4))) || '-' || lower(hex(randomblob(2))) || '-4' || substr(lower(hex(randomblob(2))),2) || '-' || substr('89ab',abs(random()) % 4 + 1, 1) || substr(lower(hex(randomblob(2))),2) || '-' || lower(hex(randomblob(6)))),
    key         TEXT NOT NULL DEFAULT '' UNIQUE,
    value       TEXT NOT NULL DEFAULT '',
    created_at  DATETIME,
    updated_at  DATETIME,
    deleted_at  DATETIME
);

UPDATE "connection" SET
    group_id   = COALESCE(group_id, ''),
    ssh_id     = COALESCE(ssh_id, ''),
    proxy_id   = COALESCE(proxy_id, ''),
    tls_id     = COALESCE(tls_id, ''),
    created_at = COALESCE(created_at, CURRENT_TIMESTAMP),
    updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP)
WHERE group_id IS NULL OR ssh_id IS NULL OR proxy_id IS NULL OR tls_id IS NULL
   OR created_at IS NULL OR updated_at IS NULL;

UPDATE "ssh" SET created_at = COALESCE(created_at, CURRENT_TIMESTAMP), updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP) WHERE created_at IS NULL OR updated_at IS NULL;
UPDATE "tls" SET created_at = COALESCE(created_at, CURRENT_TIMESTAMP), updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP) WHERE created_at IS NULL OR updated_at IS NULL;
UPDATE proxy SET created_at = COALESCE(created_at, CURRENT_TIMESTAMP), updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP) WHERE created_at IS NULL OR updated_at IS NULL;
UPDATE "group" SET created_at = COALESCE(created_at, CURRENT_TIMESTAMP), updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP) WHERE created_at IS NULL OR updated_at IS NULL;
UPDATE "setting" SET created_at = COALESCE(created_at, CURRENT_TIMESTAMP), updated_at = COALESCE(updated_at, CURRENT_TIMESTAMP) WHERE created_at IS NULL OR updated_at IS NULL;
