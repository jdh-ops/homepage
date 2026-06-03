-- 데이터 확인용 테이블 (열 10개)
CREATE TABLE IF NOT EXISTS dataset_records (
  id BIGSERIAL PRIMARY KEY,
  col_1 TEXT,
  col_2 TEXT,
  col_3 TEXT,
  col_4 TEXT,
  col_5 TEXT,
  col_6 TEXT,
  col_7 TEXT,
  col_8 TEXT,
  col_9 TEXT,
  col_10 TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dataset_records_created_at
  ON dataset_records (created_at DESC);

ALTER TABLE dataset_records ENABLE ROW LEVEL SECURITY;

-- 읽기: 화면 표시용 (anon)
CREATE POLICY "allow_select_dataset_records" ON dataset_records
  FOR SELECT USING (true);

-- 쓰기: Edge Function(service_role)만 가능 (anon INSERT 정책 없음)
