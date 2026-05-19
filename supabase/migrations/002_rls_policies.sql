-- RLS policies: allow anon reads, restrict writes to server-side (service role bypasses RLS)

-- anon SELECT on all tables
CREATE POLICY "anon_read_hcps" ON hcps FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_visits" ON visits FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_territory" ON territory FOR SELECT TO anon USING (true);
CREATE POLICY "anon_read_rep_schedule" ON rep_schedule FOR SELECT TO anon USING (true);

-- anon needs realtime subscriptions (postgres_changes uses SELECT policies)
-- No additional policy needed — SELECT covers it.
