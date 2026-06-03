-- 분류명 변경: 무관 → 무시 (이미 20250603000004 를 실행한 DB용)
UPDATE dataset_record_meta SET category = '무시' WHERE category = '무관';

ALTER TABLE dataset_record_meta DROP CONSTRAINT IF EXISTS dataset_record_meta_category_check;

ALTER TABLE dataset_record_meta ADD CONSTRAINT dataset_record_meta_category_check CHECK (
  category IN ('미분류', '의심', '블랙리스트', '화이트리스트', '무시', '기타')
);
