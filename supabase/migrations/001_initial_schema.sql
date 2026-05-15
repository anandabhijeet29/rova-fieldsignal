-- Rova HCP Voice Agent: Initial Schema
-- Tables: hcps, visits, territory, rep_schedule

-- hcps: doctor profiles
CREATE TABLE hcps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  specialty TEXT NOT NULL,
  practice_group TEXT,
  prescribing_tier TEXT CHECK (prescribing_tier IN ('high', 'medium', 'low')),
  preferred_topics TEXT[],
  notes TEXT,
  last_visit_date DATE,
  region TEXT NOT NULL
);

-- visits: each visit interaction
CREATE TABLE visits (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  hcp_id UUID REFERENCES hcps(id) NOT NULL,
  visit_date DATE NOT NULL,
  visit_order INT NOT NULL,
  raw_transcript TEXT,
  extracted_data JSONB,
  cross_visit_summary TEXT,
  status TEXT CHECK (status IN ('upcoming', 'briefed', 'extracting', 'debriefed'))
    DEFAULT 'upcoming',
  created_at TIMESTAMPTZ DEFAULT now()
);

-- territory: pre-seeded territory intelligence (v1, D14)
CREATE TABLE territory (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  region TEXT NOT NULL,
  trending_objections JSONB,
  competitive_mentions JSONB,
  prescription_trends JSONB
);

-- rep_schedule: daily visit schedule
CREATE TABLE rep_schedule (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  rep_id TEXT DEFAULT 'demo-rep',
  visit_date DATE NOT NULL,
  visit_order INT NOT NULL,
  hcp_id UUID REFERENCES hcps(id) NOT NULL,
  status TEXT CHECK (status IN ('upcoming', 'briefed', 'extracting', 'debriefed'))
    DEFAULT 'upcoming',
  region TEXT NOT NULL
);

-- Enable realtime for dashboard (D15)
ALTER PUBLICATION supabase_realtime ADD TABLE visits;
ALTER PUBLICATION supabase_realtime ADD TABLE rep_schedule;

-- Indexes for common queries
CREATE INDEX idx_visits_hcp_id ON visits(hcp_id);
CREATE INDEX idx_visits_status ON visits(status);
CREATE INDEX idx_rep_schedule_date ON rep_schedule(visit_date);
CREATE INDEX idx_rep_schedule_rep ON rep_schedule(rep_id);
