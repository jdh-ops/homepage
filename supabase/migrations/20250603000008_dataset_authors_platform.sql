-- 작성자 관리: 플랫폼(col_1) 복합 키 · 동일 플랫폼+작성자만 분류 변경
ALTER TABLE dataset_authors
  ADD COLUMN IF NOT EXISTS platform TEXT NOT NULL DEFAULT '';

ALTER TABLE dataset_authors DROP CONSTRAINT IF EXISTS dataset_authors_pkey;

ALTER TABLE dataset_authors
  ADD PRIMARY KEY (platform, author_name);

CREATE INDEX IF NOT EXISTS idx_dataset_records_col_1_col_10
  ON dataset_records (col_1, col_10);

DROP FUNCTION IF EXISTS public.apply_author_category(TEXT, TEXT);

CREATE OR REPLACE FUNCTION public.apply_author_category(
  p_author_name TEXT,
  p_platform TEXT,
  p_category TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected INTEGER;
  norm_author TEXT;
  norm_platform TEXT;
BEGIN
  norm_author := trim(p_author_name);
  norm_platform := trim(coalesce(p_platform, ''));
  IF norm_author = '' THEN
    RETURN 0;
  END IF;
  IF p_category NOT IN ('블랙리스트', '화이트리스트', '무시') THEN
    RAISE EXCEPTION 'category must be 블랙리스트, 화이트리스트, or 무시';
  END IF;

  INSERT INTO dataset_authors (platform, author_name, list_type, updated_at)
  VALUES (norm_platform, norm_author, p_category, now())
  ON CONFLICT (platform, author_name)
  DO UPDATE SET list_type = EXCLUDED.list_type, updated_at = now();

  INSERT INTO dataset_record_meta (record_id, category)
  SELECT r.id, p_category
  FROM dataset_records r
  WHERE trim(coalesce(r.col_10, '')) = norm_author
    AND trim(coalesce(r.col_1, '')) = norm_platform
  ON CONFLICT (record_id) DO NOTHING;

  UPDATE dataset_record_meta m
  SET category = p_category, updated_at = now()
  FROM dataset_records r
  WHERE m.record_id = r.id
    AND trim(coalesce(r.col_10, '')) = norm_author
    AND trim(coalesce(r.col_1, '')) = norm_platform;

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;

GRANT EXECUTE ON FUNCTION public.apply_author_category(TEXT, TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.apply_author_category(TEXT, TEXT, TEXT) TO authenticated;
