-- 태그 열 추가
ALTER TABLE dataset_records
  ADD COLUMN IF NOT EXISTS tag TEXT;

-- 태그 수정 (브라우저에서 선택 행 일괄 업데이트)
CREATE POLICY "allow_update_dataset_records" ON dataset_records
  FOR UPDATE USING (true) WITH CHECK (true);
