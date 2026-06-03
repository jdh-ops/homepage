-- 데이터 관리 (분류·상태·태그·메모) — dataset_records 와 1:1 연동
CREATE TABLE IF NOT EXISTS dataset_record_meta (
  id BIGSERIAL PRIMARY KEY,
  record_id BIGINT NOT NULL UNIQUE REFERENCES dataset_records(id) ON DELETE CASCADE,
  category TEXT NOT NULL DEFAULT '미분류',
  status TEXT,
  tag TEXT,
  memo TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CONSTRAINT dataset_record_meta_category_check CHECK (
    category IN ('미분류', '의심', '블랙리스트', '화이트리스트', '무시', '기타')
  )
);

CREATE INDEX IF NOT EXISTS idx_dataset_record_meta_category
  ON dataset_record_meta (category);

CREATE INDEX IF NOT EXISTS idx_dataset_record_meta_record_id
  ON dataset_record_meta (record_id);

ALTER TABLE dataset_record_meta ENABLE ROW LEVEL SECURITY;

CREATE POLICY "allow_select_dataset_record_meta" ON dataset_record_meta
  FOR SELECT USING (true);

CREATE POLICY "allow_insert_dataset_record_meta" ON dataset_record_meta
  FOR INSERT WITH CHECK (true);

CREATE POLICY "allow_update_dataset_record_meta" ON dataset_record_meta
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "allow_delete_dataset_record_meta" ON dataset_record_meta
  FOR DELETE USING (true);

-- 신규 데이터 행마다 관리 레코드 자동 생성
CREATE OR REPLACE FUNCTION public.create_dataset_record_meta()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO dataset_record_meta (record_id, category)
  VALUES (NEW.id, '미분류')
  ON CONFLICT (record_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_dataset_record_meta ON dataset_records;
CREATE TRIGGER trg_create_dataset_record_meta
  AFTER INSERT ON dataset_records
  FOR EACH ROW
  EXECUTE FUNCTION public.create_dataset_record_meta();

-- 기존 데이터: meta 없으면 생성, 예전 dataset_records.tag 는 meta.tag 로 이전
INSERT INTO dataset_record_meta (record_id, category, tag)
SELECT r.id, '미분류', r.tag
FROM dataset_records r
WHERE NOT EXISTS (
  SELECT 1 FROM dataset_record_meta m WHERE m.record_id = r.id
);
