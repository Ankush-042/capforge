-- Migration 001: Identity & Profile Foundation (Sprint 1)
-- Ref: Architecture doc §13-17, TRD §11-12

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS vector;

CREATE TYPE user_role AS ENUM ('FOUNDER', 'CONTRIBUTOR', 'INVESTOR');

CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  primary_role user_role NOT NULL,
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  last_login_at TIMESTAMPTZ
);

CREATE TABLE profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  display_name TEXT NOT NULL,
  headline TEXT,
  bio TEXT,
  location TEXT,
  profile_image TEXT,
  completion_score INTEGER NOT NULL DEFAULT 0,
  visibility TEXT NOT NULL DEFAULT 'DISCOVERABLE',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);

CREATE TABLE contributor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  availability TEXT,
  commitment_type TEXT,
  preferred_stage TEXT[],
  preferred_domains TEXT[],
  experience_years INTEGER,
  equity_preference TEXT,
  portfolio_url TEXT,
  UNIQUE(profile_id)
);

CREATE TABLE investor_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  thesis TEXT,
  ticket_min NUMERIC,
  ticket_max NUMERIC,
  preferred_stages TEXT[],
  preferred_domains TEXT[],
  preferred_geographies TEXT[],
  investment_type TEXT,
  UNIQUE(profile_id)
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_profiles_user_id ON profiles(user_id);
