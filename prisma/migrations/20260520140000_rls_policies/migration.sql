-- RLS (Row Level Security) — defence-in-depth для прямого доступа через Supabase REST API.
-- Prisma использует service_role и RLS не затронет.
-- auth.uid() возвращает uuid, поля userId/id — text: нужен каст ::text.
-- Идемпотентно: DROP IF EXISTS перед каждой политикой.

-- ── Включаем RLS на всех таблицах ────────────────────────────────────────────
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE yandex_accounts ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE portfolio_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE candidate_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE hr_slots ENABLE ROW LEVEL SECURITY;
ALTER TABLE position_skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE matches ENABLE ROW LEVEL SECURITY;
ALTER TABLE interviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_aliases ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_relations ENABLE ROW LEVEL SECURITY;

-- ── Публичные справочники ─────────────────────────────────────────────────────
DROP POLICY IF EXISTS "skills_read_authenticated" ON skills;
CREATE POLICY "skills_read_authenticated" ON skills
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "skill_aliases_read_authenticated" ON skill_aliases;
CREATE POLICY "skill_aliases_read_authenticated" ON skill_aliases
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "skill_relations_read_authenticated" ON skill_relations;
CREATE POLICY "skill_relations_read_authenticated" ON skill_relations
  FOR SELECT TO authenticated USING (true);

-- ── users ─────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "users_own" ON users;
CREATE POLICY "users_own" ON users
  FOR ALL TO authenticated
  USING (auth.uid()::text = id)
  WITH CHECK (auth.uid()::text = id);

-- ── Яндекс OAuth токены ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "yandex_accounts_own" ON yandex_accounts;
CREATE POLICY "yandex_accounts_own" ON yandex_accounts
  FOR ALL TO authenticated
  USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");

-- ── Профиль соискателя ────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "candidate_profiles_own" ON candidate_profiles;
CREATE POLICY "candidate_profiles_own" ON candidate_profiles
  FOR ALL TO authenticated
  USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "candidate_skills_own" ON candidate_skills;
CREATE POLICY "candidate_skills_own" ON candidate_skills
  FOR ALL TO authenticated
  USING (
    "candidateId" IN (
      SELECT id FROM candidate_profiles WHERE "userId" = auth.uid()::text
    )
  )
  WITH CHECK (
    "candidateId" IN (
      SELECT id FROM candidate_profiles WHERE "userId" = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "portfolio_links_own" ON portfolio_links;
CREATE POLICY "portfolio_links_own" ON portfolio_links
  FOR ALL TO authenticated
  USING (
    "candidateId" IN (
      SELECT id FROM candidate_profiles WHERE "userId" = auth.uid()::text
    )
  )
  WITH CHECK (
    "candidateId" IN (
      SELECT id FROM candidate_profiles WHERE "userId" = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "candidate_slots_own" ON candidate_slots;
CREATE POLICY "candidate_slots_own" ON candidate_slots
  FOR ALL TO authenticated
  USING (
    "candidateId" IN (
      SELECT id FROM candidate_profiles WHERE "userId" = auth.uid()::text
    )
  )
  WITH CHECK (
    "candidateId" IN (
      SELECT id FROM candidate_profiles WHERE "userId" = auth.uid()::text
    )
  );

-- ── Компания и вакансии ───────────────────────────────────────────────────────
DROP POLICY IF EXISTS "companies_own" ON companies;
CREATE POLICY "companies_own" ON companies
  FOR ALL TO authenticated
  USING (auth.uid()::text = "userId")
  WITH CHECK (auth.uid()::text = "userId");

DROP POLICY IF EXISTS "positions_own_company" ON positions;
CREATE POLICY "positions_own_company" ON positions
  FOR ALL TO authenticated
  USING (
    "companyId" IN (
      SELECT id FROM companies WHERE "userId" = auth.uid()::text
    )
  )
  WITH CHECK (
    "companyId" IN (
      SELECT id FROM companies WHERE "userId" = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "hr_slots_own" ON hr_slots;
CREATE POLICY "hr_slots_own" ON hr_slots
  FOR ALL TO authenticated
  USING (
    "positionId" IN (
      SELECT p.id FROM positions p
      JOIN companies c ON p."companyId" = c.id
      WHERE c."userId" = auth.uid()::text
    )
  )
  WITH CHECK (
    "positionId" IN (
      SELECT p.id FROM positions p
      JOIN companies c ON p."companyId" = c.id
      WHERE c."userId" = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "position_skills_own" ON position_skills;
CREATE POLICY "position_skills_own" ON position_skills
  FOR ALL TO authenticated
  USING (
    "positionId" IN (
      SELECT p.id FROM positions p
      JOIN companies c ON p."companyId" = c.id
      WHERE c."userId" = auth.uid()::text
    )
  )
  WITH CHECK (
    "positionId" IN (
      SELECT p.id FROM positions p
      JOIN companies c ON p."companyId" = c.id
      WHERE c."userId" = auth.uid()::text
    )
  );

-- ── Матчи ─────────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "matches_candidate_select" ON matches;
CREATE POLICY "matches_candidate_select" ON matches
  FOR SELECT TO authenticated
  USING (
    "candidateId" IN (
      SELECT id FROM candidate_profiles WHERE "userId" = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "matches_employer_select" ON matches;
CREATE POLICY "matches_employer_select" ON matches
  FOR SELECT TO authenticated
  USING (
    "positionId" IN (
      SELECT p.id FROM positions p
      JOIN companies c ON p."companyId" = c.id
      WHERE c."userId" = auth.uid()::text
    )
  );

-- ── Встречи ───────────────────────────────────────────────────────────────────
DROP POLICY IF EXISTS "interviews_candidate_select" ON interviews;
CREATE POLICY "interviews_candidate_select" ON interviews
  FOR SELECT TO authenticated
  USING (
    "matchId" IN (
      SELECT m.id FROM matches m
      JOIN candidate_profiles cp ON m."candidateId" = cp.id
      WHERE cp."userId" = auth.uid()::text
    )
  );

DROP POLICY IF EXISTS "interviews_employer_select" ON interviews;
CREATE POLICY "interviews_employer_select" ON interviews
  FOR SELECT TO authenticated
  USING (
    "matchId" IN (
      SELECT m.id FROM matches m
      JOIN positions p ON m."positionId" = p.id
      JOIN companies c ON p."companyId" = c.id
      WHERE c."userId" = auth.uid()::text
    )
  );
