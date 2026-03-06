-- 관리자 비밀번호 해시 저장 테이블 (어드민 보안 강화)
-- Supabase 대시보드 > SQL Editor에서 이 파일 내용을 실행하거나,
-- CLI 사용 시: supabase db push (또는 migration 적용)

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS admin_auth (
  id int PRIMARY KEY DEFAULT 1,
  password_hash text NOT NULL,
  updated_at timestamptz DEFAULT now()
);

-- 초기 비밀번호: 'admin' (배포 후 반드시 변경 권장)
-- 비밀번호 변경: 아래 주석을 참고해 SQL로 직접 업데이트
INSERT INTO admin_auth (id, password_hash)
VALUES (1, crypt('admin', gen_salt('bf')))
ON CONFLICT (id) DO NOTHING;

-- RLS: 이 테이블은 클라이언트에서 직접 읽기/쓰기 불가.
-- Edge Function만 service_role로 접근하므로 RLS 비활성화해도 됨.
ALTER TABLE admin_auth ENABLE ROW LEVEL SECURITY;

CREATE POLICY "no_direct_access" ON admin_auth
  AS RESTRICTIVE FOR ALL USING (false);

COMMENT ON TABLE admin_auth IS '관리자 로그인용 비밀번호 해시. Edge Function에서만 사용.';

-- 비밀번호 변경 예시 (실행 시 '새비밀번호'를 원하는 값으로 바꿀 것):
-- UPDATE admin_auth SET password_hash = crypt('새비밀번호', gen_salt('bf')), updated_at = now() WHERE id = 1;
