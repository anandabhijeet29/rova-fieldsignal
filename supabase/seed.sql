-- Rova HCP Voice Agent: Seed Data
--
-- 5 HCPs with realistic pharma profiles
-- 4 scheduled visits for today (demo day)
-- Prior visit history with extracted data for cross-visit testing
-- Territory intelligence data (pre-seeded, D14)
--
-- Mock data requirements from eng plan:
--   - At least 2 HCPs share a practice_group (Dr. Chen + Dr. Patel = Metro Endocrine Associates)
--   - Each HCP has 2-4 prior visits with realistic extracted_data
--   - Real drug class names (GLP-1 agonists, SGLT2 inhibitors), fictional brands
--   - Mix of sentiments and objection types
--   - Territory data pre-seeded matching seed visits
--   - Cross-visit data designed so substring matching (D3) produces meaningful results

-- ═══════════════════════════════════════════════════════════════════
-- HCPs
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO hcps (id, name, specialty, practice_group, prescribing_tier, preferred_topics, notes, last_visit_date, region) VALUES
  -- Dr. Chen and Dr. Patel share Metro Endocrine Associates (cross-visit testing)
  ('a1b2c3d4-0001-4000-8000-000000000001', 'Dr. Sarah Chen', 'Endocrinology', 'Metro Endocrine Associates', 'high',
   ARRAY['GLP-1 agonists', 'cardiovascular outcomes', 'weight management'],
   'Key opinion leader in diabetes management. Published on GLP-1 outcomes. Prefers data-driven discussions.',
   '2026-05-01', 'Northeast'),

  ('a1b2c3d4-0002-4000-8000-000000000002', 'Dr. Raj Patel', 'Endocrinology', 'Metro Endocrine Associates', 'medium',
   ARRAY['SGLT2 inhibitors', 'renal outcomes', 'combination therapy'],
   'Newer to the practice. Open to new evidence but cautious about switching patients. Responds well to case studies.',
   '2026-05-08', 'Northeast'),

  ('a1b2c3d4-0003-4000-8000-000000000003', 'Dr. Maria Rodriguez', 'Internal Medicine', 'Valley Primary Care', 'high',
   ARRAY['GLP-1 agonists', 'patient adherence', 'formulary access'],
   'High-volume prescriber. Biggest concern is always patient cost and insurance coverage. Very time-constrained.',
   '2026-05-10', 'Northeast'),

  ('a1b2c3d4-0004-4000-8000-000000000004', 'Dr. James Thompson', 'Cardiology', NULL, 'low',
   ARRAY['cardiovascular outcomes', 'heart failure', 'lipid management'],
   'Solo practice. Skeptical of pharma reps. Needs strong clinical evidence. Responds to peer-reviewed data only.',
   '2026-04-20', 'Northeast'),

  ('a1b2c3d4-0005-4000-8000-000000000005', 'Dr. Emily Nakamura', 'Family Medicine', 'Valley Primary Care', 'medium',
   ARRAY['patient adherence', 'SGLT2 inhibitors', 'diabetes screening'],
   'Early career physician. Very receptive to educational materials. Interested in simplifying diabetes management protocols.',
   '2026-05-05', 'Northeast');

-- ═══════════════════════════════════════════════════════════════════
-- Prior visits with extracted data (for briefing context + cross-visit)
-- ═══════════════════════════════════════════════════════════════════

-- Dr. Chen - 3 prior visits
INSERT INTO visits (id, hcp_id, visit_date, visit_order, raw_transcript, extracted_data, cross_visit_summary, status) VALUES
  ('b1b2c3d4-0001-4000-8000-000000000001', 'a1b2c3d4-0001-4000-8000-000000000001', '2026-04-15', 1,
   'Rep: Morning Dr. Chen. Chen: Hi, come in. Been looking at the latest GLP-1 data...',
   '{"sentiment": "positive", "objections": ["insurance coverage concerns for Treziva"], "samples_dropped": ["Treziva 1.5mg starter pack"], "follow_ups": [{"action": "Send Phase III cardiovascular outcomes data", "due_date": "2026-04-22"}], "competitive_intel": ["Mentioned Ozempic pricing advantage", "Considering Mounjaro for some patients"], "key_quotes": ["The A1C reduction data is compelling but my patients struggle with out-of-pocket costs"], "prescription_intent": "likely"}',
   'Endocrinologist shows strong interest in GLP-1 agonist data, especially cardiovascular outcomes. Insurance coverage is the main barrier. Ozempic and Mounjaro are active competitors in this space. A1C reduction data resonated.',
   'debriefed'),

  ('b1b2c3d4-0002-4000-8000-000000000002', 'a1b2c3d4-0001-4000-8000-000000000001', '2026-05-01', 1,
   'Rep: Dr. Chen, good to see you again. Chen: Yes, I reviewed the CV outcomes data you sent...',
   '{"sentiment": "positive", "objections": ["wants head-to-head data vs Mounjaro"], "samples_dropped": ["Treziva 3mg maintenance pack"], "follow_ups": [{"action": "Arrange peer-to-peer with Dr. Williams at Metro General", "due_date": "2026-05-15"}], "competitive_intel": ["Mounjaro gaining traction in practice group", "Heard about new Ozempic formulation"], "key_quotes": ["I need to see how Treziva stacks up directly against tirzepatide before I make it my first-line"], "prescription_intent": "likely"}',
   'GLP-1 market is competitive with Mounjaro gaining ground. Physicians want head-to-head comparison data. Peer-to-peer programs are effective for building conviction. New Ozempic formulations are creating buzz.',
   'debriefed');

-- Dr. Patel - 2 prior visits (same practice group as Chen - cross-visit match)
INSERT INTO visits (id, hcp_id, visit_date, visit_order, raw_transcript, extracted_data, cross_visit_summary, status) VALUES
  ('b1b2c3d4-0003-4000-8000-000000000003', 'a1b2c3d4-0002-4000-8000-000000000002', '2026-04-20', 2,
   'Rep: Hi Dr. Patel. Patel: Come in. I have about 10 minutes...',
   '{"sentiment": "neutral", "objections": ["concerned about renal effects in elderly patients", "prefers SGLT2 for patients with CKD"], "samples_dropped": ["Treziva 1.5mg starter pack"], "follow_ups": [{"action": "Send renal safety data from SUSTAIN-6 substudy", "due_date": "2026-04-28"}], "competitive_intel": ["Using Jardiance as first-line for diabetic patients with CKD", "Mentioned new SGLT2 inhibitor from competitor"], "key_quotes": ["For my CKD patients, SGLT2 inhibitors still have the stronger evidence base"], "prescription_intent": "unlikely"}',
   'SGLT2 inhibitors remain preferred for patients with chronic kidney disease. Renal safety data is crucial for GLP-1 adoption in this segment. Jardiance has strong positioning with nephrological evidence.',
   'debriefed'),

  ('b1b2c3d4-0004-4000-8000-000000000004', 'a1b2c3d4-0002-4000-8000-000000000002', '2026-05-08', 2,
   'Rep: Dr. Patel, thanks for fitting me in. Patel: Sure, what is new with Treziva?...',
   '{"sentiment": "positive", "objections": ["wants to see real-world evidence, not just clinical trials"], "samples_dropped": ["Treziva 3mg maintenance pack"], "follow_ups": [{"action": "Share real-world evidence registry data", "due_date": "2026-05-20"}], "competitive_intel": ["Practice group discussing standardizing GLP-1 protocols", "Mounjaro being evaluated for formulary"], "key_quotes": ["Dr. Chen mentioned she has been getting good results with GLP-1s — maybe it is time I expanded my prescribing"], "prescription_intent": "likely"}',
   'Practice group influence is driving GLP-1 consideration among previously SGLT2-focused physicians. Real-world evidence requests signal readiness to adopt. Formulary discussions are underway for competitive products.',
   'debriefed');

-- Dr. Rodriguez - 2 prior visits
INSERT INTO visits (id, hcp_id, visit_date, visit_order, raw_transcript, extracted_data, cross_visit_summary, status) VALUES
  ('b1b2c3d4-0005-4000-8000-000000000005', 'a1b2c3d4-0003-4000-8000-000000000003', '2026-04-25', 3,
   'Rep: Dr. Rodriguez, thanks for your time. Rodriguez: Make it quick, I have patients...',
   '{"sentiment": "neutral", "objections": ["prior authorization burden", "patients cannot afford copays"], "samples_dropped": ["Treziva 1.5mg starter pack", "Treziva copay cards"], "follow_ups": [{"action": "Connect with access team for prior auth support", "due_date": "2026-05-02"}], "competitive_intel": ["Ozempic has better formulary placement at major PBMs"], "key_quotes": ["I love the efficacy but if my staff spends 30 minutes on prior auth for every script, it is not sustainable"], "prescription_intent": "likely"}',
   'Prior authorization burden is a major barrier to GLP-1 adoption in high-volume primary care. Copay assistance programs and access support are critical differentiators. Formulary placement directly impacts prescribing decisions.',
   'debriefed'),

  ('b1b2c3d4-0006-4000-8000-000000000006', 'a1b2c3d4-0003-4000-8000-000000000003', '2026-05-10', 3,
   'Rep: Dr. Rodriguez. Rodriguez: Hi, the copay cards have been helpful...',
   '{"sentiment": "positive", "objections": ["still wants streamlined prior auth process"], "samples_dropped": ["Treziva 3mg maintenance pack"], "follow_ups": [{"action": "Schedule access team visit to train staff on e-prior-auth", "due_date": "2026-05-17"}], "competitive_intel": ["Ozempic running aggressive patient savings program"], "key_quotes": ["The copay cards made a real difference — three patients were able to start last month"], "prescription_intent": "likely"}',
   'Copay assistance programs are a proven lever for increasing prescriptions in cost-sensitive practices. Prior authorization remains a friction point but is being addressed. Competitive savings programs are escalating.',
   'debriefed');

-- Dr. Thompson - 2 prior visits
INSERT INTO visits (id, hcp_id, visit_date, visit_order, raw_transcript, extracted_data, cross_visit_summary, status) VALUES
  ('b1b2c3d4-0007-4000-8000-000000000007', 'a1b2c3d4-0004-4000-8000-000000000004', '2026-03-15', 4,
   'Rep: Dr. Thompson, I wanted to share some new cardiovascular data. Thompson: I have seen a lot of pharma data...',
   '{"sentiment": "negative", "objections": ["skeptical of industry-sponsored trials", "wants independent meta-analyses", "does not see incremental benefit over existing therapies"], "samples_dropped": [], "follow_ups": [{"action": "Find independent systematic review on GLP-1 CV outcomes", "due_date": "2026-04-01"}], "competitive_intel": ["Exclusively prescribes generic statins and ACE inhibitors", "Dismissive of newer diabetes drugs for CV benefit"], "key_quotes": ["Show me a Cochrane review, not a company-sponsored trial"], "prescription_intent": "unlikely"}',
   'Evidence-based skeptics require independent (non-industry) data sources. Cochrane reviews and independent meta-analyses are the only credible sources for this physician profile. Generic-first prescribers are difficult to convert.',
   'debriefed'),

  ('b1b2c3d4-0008-4000-8000-000000000008', 'a1b2c3d4-0004-4000-8000-000000000004', '2026-04-20', 4,
   'Rep: Dr. Thompson, I found that independent review. Thompson: Let me see...',
   '{"sentiment": "neutral", "objections": ["acknowledges data but still prefers established protocols"], "samples_dropped": ["Treziva 1.5mg starter pack"], "follow_ups": [{"action": "Send link to published independent CV outcomes meta-analysis", "due_date": "2026-04-28"}], "competitive_intel": ["Starting to hear about GLP-1 CV benefits from cardiology conferences"], "key_quotes": ["The independent data is more convincing. I might consider it for select patients with dual diabetes-CV risk"], "prescription_intent": "unclear"}',
   'Independent clinical evidence can shift even skeptical physicians over time. Conference peer influence is a secondary channel. Targeting dual-indication patients (diabetes + cardiovascular) is the best entry point for resistant prescribers.',
   'debriefed');

-- ═══════════════════════════════════════════════════════════════════
-- Today's visits (upcoming - the demo day)
-- Using the same IDs for visits and rep_schedule for simplicity
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO visits (id, hcp_id, visit_date, visit_order, status) VALUES
  ('c1b2c3d4-0001-4000-8000-000000000001', 'a1b2c3d4-0001-4000-8000-000000000001', CURRENT_DATE, 1, 'upcoming'),
  ('c1b2c3d4-0002-4000-8000-000000000002', 'a1b2c3d4-0002-4000-8000-000000000002', CURRENT_DATE, 2, 'upcoming'),
  ('c1b2c3d4-0003-4000-8000-000000000003', 'a1b2c3d4-0003-4000-8000-000000000003', CURRENT_DATE, 3, 'upcoming'),
  ('c1b2c3d4-0004-4000-8000-000000000004', 'a1b2c3d4-0004-4000-8000-000000000004', CURRENT_DATE, 4, 'upcoming');

INSERT INTO rep_schedule (id, rep_id, visit_date, visit_order, hcp_id, status, region) VALUES
  ('c1b2c3d4-0001-4000-8000-000000000001', 'demo-rep', CURRENT_DATE, 1, 'a1b2c3d4-0001-4000-8000-000000000001', 'upcoming', 'Northeast'),
  ('c1b2c3d4-0002-4000-8000-000000000002', 'demo-rep', CURRENT_DATE, 2, 'a1b2c3d4-0002-4000-8000-000000000002', 'upcoming', 'Northeast'),
  ('c1b2c3d4-0003-4000-8000-000000000003', 'demo-rep', CURRENT_DATE, 3, 'a1b2c3d4-0003-4000-8000-000000000003', 'upcoming', 'Northeast'),
  ('c1b2c3d4-0004-4000-8000-000000000004', 'demo-rep', CURRENT_DATE, 4, 'a1b2c3d4-0004-4000-8000-000000000004', 'upcoming', 'Northeast');

-- ═══════════════════════════════════════════════════════════════════
-- Territory intelligence (pre-seeded, D14)
-- Data matches the patterns from seed visits above
-- ═══════════════════════════════════════════════════════════════════

INSERT INTO territory (id, region, trending_objections, competitive_mentions, prescription_trends) VALUES
  ('d1b2c3d4-0001-4000-8000-000000000001', 'Northeast',
   '[
     {"objection": "Prior authorization burden", "count": 12, "trend": "rising"},
     {"objection": "Patient cost concerns", "count": 9, "trend": "stable"},
     {"objection": "Wants head-to-head data", "count": 7, "trend": "rising"},
     {"objection": "Prefers established protocols", "count": 5, "trend": "declining"},
     {"objection": "Renal safety concerns", "count": 4, "trend": "stable"}
   ]'::jsonb,
   '[
     {"competitor": "Ozempic (Novo Nordisk)", "mentions": 15, "context": "Formulary advantage and patient savings programs"},
     {"competitor": "Mounjaro (Eli Lilly)", "mentions": 11, "context": "Gaining traction, head-to-head comparisons requested"},
     {"competitor": "Jardiance (BI/Lilly)", "mentions": 8, "context": "Preferred for CKD patients, strong renal evidence"},
     {"competitor": "Generic statins", "mentions": 4, "context": "Baseline therapy, resistance to newer agents"}
   ]'::jsonb,
   '[
     {"drug_class": "GLP-1 agonists", "intent_rate": 0.68, "trend": "up"},
     {"drug_class": "SGLT2 inhibitors", "intent_rate": 0.55, "trend": "flat"},
     {"drug_class": "DPP-4 inhibitors", "intent_rate": 0.25, "trend": "down"},
     {"drug_class": "Insulin analogs", "intent_rate": 0.40, "trend": "flat"}
   ]'::jsonb);
