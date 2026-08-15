CREATE TABLE equity_calculations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  startup_id UUID REFERENCES startups(id) ON DELETE CASCADE,
  calculation_type TEXT NOT NULL, -- FOUNDER_SPLIT | CONTRIBUTOR_ASK
  inputs JSONB NOT NULL,
  result JSONB NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE opportunities (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  type TEXT NOT NULL, -- GRANT | INCUBATOR | ACCELERATOR | PROGRAM
  provider TEXT,
  description TEXT,
  eligibility TEXT,
  domain TEXT[],
  stage TEXT[],
  geography TEXT[],
  url TEXT,
  deadline DATE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX idx_equity_user_id ON equity_calculations(user_id);
CREATE INDEX idx_opportunities_domain ON opportunities USING GIN(domain);
