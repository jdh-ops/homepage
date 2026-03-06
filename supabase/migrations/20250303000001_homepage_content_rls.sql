-- homepage_content: 읽기는 누구나(anon), 쓰기는 service_role만(Edge Function)
-- 어드민 저장은 admin-save Edge Function을 통해서만 가능하도록 함

ALTER TABLE homepage_content ENABLE ROW LEVEL SECURITY;

-- 읽기: 모든 요청 허용 (인덱스 페이지·어드민 미리보기)
CREATE POLICY "allow_select_homepage_content" ON homepage_content
  FOR SELECT USING (true);

-- 쓰기(INSERT/UPDATE/DELETE): anon에게는 허용하지 않음 → service_role만 가능
-- (정책을 만들지 않으면 anon은 쓰기 불가, service_role은 RLS를 우회하므로 쓰기 가능)
