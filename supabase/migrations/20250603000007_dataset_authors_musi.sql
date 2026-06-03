-- 작성자 관리: '무시' 분류 추가
ALTER TABLE dataset_authors DROP CONSTRAINT IF EXISTS dataset_authors_list_type_check;

ALTER TABLE dataset_authors ADD CONSTRAINT dataset_authors_list_type_check CHECK (
  list_type IN ('블랙리스트', '화이트리스트', '무시')
);

CREATE OR REPLACE FUNCTION public.apply_author_category(
  p_author_name TEXT,
  p_category TEXT
)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  affected INTEGER;
  norm TEXT;
BEGIN
  norm := trim(p_author_name);
  IF norm = '' THEN
    RETURN 0;
  END IF;
  IF p_category NOT IN ('블랙리스트', '화이트리스트', '무시') THEN
    RAISE EXCEPTION 'category must be 블랙리스트, 화이트리스트, or 무시';
  END IF;

  INSERT INTO dataset_authors (author_name, list_type, updated_at)
  VALUES (norm, p_category, now())
  ON CONFLICT (author_name)
  DO UPDATE SET list_type = EXCLUDED.list_type, updated_at = now();

  INSERT INTO dataset_record_meta (record_id, category)
  SELECT r.id, p_category
  FROM dataset_records r
  WHERE trim(coalesce(r.col_10, '')) = norm
  ON CONFLICT (record_id) DO NOTHING;

  UPDATE dataset_record_meta m
  SET category = p_category, updated_at = now()
  FROM dataset_records r
  WHERE m.record_id = r.id
    AND trim(coalesce(r.col_10, '')) = norm;

  GET DIAGNOSTICS affected = ROW_COUNT;
  RETURN affected;
END;
$$;
