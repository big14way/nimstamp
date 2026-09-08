PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS merchants (
  id            TEXT PRIMARY KEY,           -- 8-char base32, e.g. "K7Q2M9XA"
  address       TEXT NOT NULL UNIQUE,       -- NIM address, normalized "NQ.." with spaces
  name          TEXT NOT NULL CHECK(length(name) BETWEEN 2 AND 40),
  city          TEXT,
  created_at    INTEGER NOT NULL,           -- unix seconds
  status        TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active','paused'))
);

CREATE TABLE IF NOT EXISTS cards (           -- 1 card per merchant in MVP
  id                  TEXT PRIMARY KEY,
  merchant_id         TEXT NOT NULL UNIQUE REFERENCES merchants(id),
  title               TEXT NOT NULL,
  reward_text         TEXT NOT NULL,
  stamps_required     INTEGER NOT NULL CHECK(stamps_required BETWEEN 2 AND 20),
  min_fiat_amount     REAL NOT NULL CHECK(min_fiat_amount > 0),
  fiat_currency       TEXT NOT NULL CHECK(fiat_currency IN ('NGN','USD','EUR')),
  velocity_minutes    INTEGER NOT NULL DEFAULT 10 CHECK(velocity_minutes BETWEEN 10 AND 60),
  created_at          INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS customer_cards (  -- one per (card, customer address)
  id              TEXT PRIMARY KEY,
  card_id         TEXT NOT NULL REFERENCES cards(id),
  address         TEXT NOT NULL,
  device_id       TEXT,                       -- 64 hex, NULL if user declined
  stamps          INTEGER NOT NULL DEFAULT 0, -- current, resets on redemption
  lifetime_stamps INTEGER NOT NULL DEFAULT 0,
  last_stamp_at   INTEGER,                    -- velocity limit
  created_at      INTEGER NOT NULL,
  UNIQUE(card_id, address)
);
CREATE INDEX IF NOT EXISTS idx_cc_device ON customer_cards(card_id, device_id);

CREATE TABLE IF NOT EXISTS payment_intents (  -- created BEFORE the wallet dialog opens
  id               TEXT PRIMARY KEY,          -- nonce, 6-char base32
  customer_card_id TEXT NOT NULL REFERENCES customer_cards(id),
  card_id          TEXT NOT NULL REFERENCES cards(id),
  memo             TEXT NOT NULL UNIQUE,      -- "NS1:<card_id>:<nonce>"
  expected_luna    INTEGER NOT NULL,
  nim_price_fiat   REAL NOT NULL,
  fiat_amount      REAL NOT NULL,
  fiat_currency    TEXT NOT NULL,
  created_at       INTEGER NOT NULL,
  expires_at       INTEGER NOT NULL,          -- created_at + 900
  status           TEXT NOT NULL DEFAULT 'pending'
                   CHECK(status IN ('pending','matched','expired')),
  last_error       TEXT                       -- e.g. AMOUNT_TOO_LOW, shown to the customer
);
CREATE INDEX IF NOT EXISTS idx_pi_cc ON payment_intents(customer_card_id, created_at);

CREATE TABLE IF NOT EXISTS stamps (           -- one row per confirmed on-chain payment
  id               TEXT PRIMARY KEY,
  customer_card_id TEXT NOT NULL REFERENCES customer_cards(id),
  card_id          TEXT NOT NULL REFERENCES cards(id),
  tx_hash          TEXT NOT NULL UNIQUE,      -- idempotency key
  intent_id        TEXT REFERENCES payment_intents(id),
  amount_luna      INTEGER NOT NULL,
  fiat_amount      REAL NOT NULL,
  fiat_currency    TEXT NOT NULL,
  block_height     INTEGER NOT NULL,
  source           TEXT NOT NULL CHECK(source IN ('watcher','manual_claim')),
  counted          INTEGER NOT NULL DEFAULT 1, -- 0 when recorded inside the velocity window
  created_at       INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_stamps_card ON stamps(card_id, created_at);

CREATE TABLE IF NOT EXISTS redemptions (
  id               TEXT PRIMARY KEY,
  customer_card_id TEXT NOT NULL REFERENCES customer_cards(id),
  card_id          TEXT NOT NULL REFERENCES cards(id),
  code             TEXT NOT NULL,
  message          TEXT NOT NULL,
  signature        TEXT,
  tx_hash          TEXT,
  status           TEXT NOT NULL DEFAULT 'issued'
                   CHECK(status IN ('issued','confirmed','expired')),
  issued_at        INTEGER NOT NULL,
  expires_at       INTEGER NOT NULL,          -- issued_at + 600
  confirmed_at     INTEGER
);
CREATE INDEX IF NOT EXISTS idx_red_card ON redemptions(card_id, issued_at);

CREATE TABLE IF NOT EXISTS sessions (         -- merchant login
  token        TEXT PRIMARY KEY,              -- sha256(bearer token) hex
  merchant_id  TEXT REFERENCES merchants(id), -- NULL until the merchant is created
  address      TEXT NOT NULL,
  created_at   INTEGER NOT NULL,
  expires_at   INTEGER NOT NULL               -- +30 days
);

CREATE TABLE IF NOT EXISTS auth_challenges (
  nonce       TEXT PRIMARY KEY,
  purpose     TEXT NOT NULL CHECK(purpose IN ('login','redeem')),
  address     TEXT NOT NULL,
  subject     TEXT,                           -- customer_card_id for 'redeem'
  message     TEXT NOT NULL,
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL                -- +5 min
);

CREATE TABLE IF NOT EXISTS handoffs (         -- laptop <-> phone login
  nonce       TEXT PRIMARY KEY,
  token       TEXT,                           -- bearer token, set once the phone signs
  created_at  INTEGER NOT NULL,
  expires_at  INTEGER NOT NULL                -- +10 min
);

CREATE TABLE IF NOT EXISTS watcher_state (
  merchant_id      TEXT PRIMARY KEY REFERENCES merchants(id),
  last_seen_height INTEGER NOT NULL DEFAULT 0,
  last_polled_at   INTEGER,
  last_error       TEXT
);

CREATE TABLE IF NOT EXISTS prices (
  currency   TEXT PRIMARY KEY,                -- 'USD','EUR','NGN'
  nim_price  REAL NOT NULL,                   -- fiat per 1 NIM
  fetched_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS rate_events (      -- generic counters (claims, ip caps)
  key        TEXT NOT NULL,
  at         INTEGER NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_rate ON rate_events(key, at);

CREATE TABLE IF NOT EXISTS meta (
  key   TEXT PRIMARY KEY,
  value TEXT NOT NULL
);
