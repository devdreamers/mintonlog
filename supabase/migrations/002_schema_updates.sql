-- supabase/migrations/002_schema_updates.sql

-- tournaments: note → partner
ALTER TABLE tournaments RENAME COLUMN note TO partner;

-- matches: opponent → opponent_team, add opponent1/opponent2
ALTER TABLE matches RENAME COLUMN opponent TO opponent_team;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS opponent1 text;
ALTER TABLE matches ADD COLUMN IF NOT EXISTS opponent2 text;
