-- Esquema de DUAM. Idempotente: se puede correr varias veces (npm run db:setup).

CREATE TABLE IF NOT EXISTS universities (
  id   serial PRIMARY KEY,
  name text NOT NULL UNIQUE,
  url  text NOT NULL,
  type text NOT NULL CHECK (type IN ('private', 'public')),
  sort int  NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS career_categories (
  id          text PRIMARY KEY,
  name        text NOT NULL,
  icon        text NOT NULL,
  image       text NOT NULL,
  description text NOT NULL,
  summary     text NOT NULL,
  tone        text NOT NULL CHECK (tone IN ('primary', 'secondary', 'success', 'accent')),
  symbol      text NOT NULL,
  sort        int  NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS career_subcategories (
  id          serial PRIMARY KEY,
  category_id text NOT NULL REFERENCES career_categories (id) ON DELETE CASCADE,
  name        text NOT NULL,
  sort        int  NOT NULL DEFAULT 0,
  UNIQUE (category_id, name)
);

CREATE TABLE IF NOT EXISTS scholarships (
  id          text PRIMARY KEY,
  title       text NOT NULL,
  description text NOT NULL,
  video_url   text NOT NULL,
  type        text NOT NULL CHECK (type IN ('government', 'academic', 'sports')),
  institution text NOT NULL,
  sort        int  NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS pqrs_tickets (
  id         serial PRIMARY KEY,
  name       text NOT NULL CHECK (char_length(name) BETWEEN 1 AND 120),
  email      text NOT NULL CHECK (char_length(email) BETWEEN 3 AND 254),
  message    text NOT NULL CHECK (char_length(message) BETWEEN 10 AND 5000),
  status     text NOT NULL DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'closed')),
  created_at timestamptz NOT NULL DEFAULT now()
);
