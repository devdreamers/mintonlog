-- 004_user_isolation.sql
-- 각 계정별 데이터 격리: user_id 컬럼 추가 + RLS 활성화

-- ── tournaments ──────────────────────────────────────────────
ALTER TABLE tournaments ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);

ALTER TABLE tournaments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_select" ON tournaments FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "own_insert" ON tournaments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "own_update" ON tournaments FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "own_delete" ON tournaments FOR DELETE USING (auth.uid() = user_id);

-- ── matches ──────────────────────────────────────────────────
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;

CREATE POLICY "own_select" ON matches FOR SELECT
  USING (EXISTS (
    SELECT 1 FROM tournaments t
    WHERE t.id = matches.tournament_id AND t.user_id = auth.uid()
  ));
CREATE POLICY "own_insert" ON matches FOR INSERT
  WITH CHECK (EXISTS (
    SELECT 1 FROM tournaments t
    WHERE t.id = matches.tournament_id AND t.user_id = auth.uid()
  ));
CREATE POLICY "own_update" ON matches FOR UPDATE
  USING (EXISTS (
    SELECT 1 FROM tournaments t
    WHERE t.id = matches.tournament_id AND t.user_id = auth.uid()
  ));
CREATE POLICY "own_delete" ON matches FOR DELETE
  USING (EXISTS (
    SELECT 1 FROM tournaments t
    WHERE t.id = matches.tournament_id AND t.user_id = auth.uid()
  ));

-- ── share_settings (단일행 → 사용자별) ──────────────────────
DROP TABLE IF EXISTS share_settings;

CREATE TABLE share_settings (
  user_id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  token   text NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE share_settings ENABLE ROW LEVEL SECURITY;

-- 공유 링크 수신자가 토큰 검증 가능
CREATE POLICY "public_read"  ON share_settings FOR SELECT USING (true);
-- 본인 설정만 수정
CREATE POLICY "own_write" ON share_settings FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- ── 기존 데이터 주의 ─────────────────────────────────────────
-- user_id가 NULL인 기존 대회 레코드는 RLS에 의해 아무도 볼 수 없게 됩니다.
-- Supabase 대시보드 Table Editor에서 직접 user_id를 할당하거나 삭제하세요.
