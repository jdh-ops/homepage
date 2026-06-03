-- col_4(URL) 조회용 인덱스
CREATE INDEX IF NOT EXISTS idx_dataset_records_col_4
  ON dataset_records (col_4)
  WHERE col_4 IS NOT NULL AND trim(col_4) <> '';

-- 신규 행 meta 생성 시 작성자 관리 테이블(list_type)으로 분류 자동 설정
CREATE OR REPLACE FUNCTION public.create_dataset_record_meta()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  author_list TEXT;
  norm_platform TEXT;
  norm_author TEXT;
  initial_category TEXT;
BEGIN
  norm_platform := trim(coalesce(NEW.col_1, ''));
  norm_author := trim(coalesce(NEW.col_10, ''));

  author_list := NULL;
  IF norm_author <> '' THEN
    SELECT a.list_type INTO author_list
    FROM dataset_authors a
    WHERE a.platform = norm_platform
      AND a.author_name = norm_author
    LIMIT 1;
  END IF;

  initial_category := coalesce(author_list, '미분류');

  INSERT INTO dataset_record_meta (record_id, category)
  VALUES (NEW.id, initial_category)
  ON CONFLICT (record_id) DO NOTHING;

  RETURN NEW;
END;
$$;
