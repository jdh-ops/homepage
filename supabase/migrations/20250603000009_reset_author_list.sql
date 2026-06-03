-- 작성자 관리 초기화: dataset_authors 에서 플랫폼+작성자 삭제
CREATE OR REPLACE FUNCTION public.reset_author_list(
  p_author_name TEXT,
  p_platform TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  norm_author TEXT;
  norm_platform TEXT;
  row_count INTEGER;
BEGIN
  norm_author := trim(p_author_name);
  norm_platform := trim(coalesce(p_platform, ''));
  IF norm_author = '' THEN
    RETURN false;
  END IF;

  DELETE FROM dataset_authors
  WHERE platform = norm_platform
    AND author_name = norm_author;

  GET DIAGNOSTICS row_count = ROW_COUNT;
  RETURN row_count > 0;
END;
$$;

GRANT EXECUTE ON FUNCTION public.reset_author_list(TEXT, TEXT) TO anon;
GRANT EXECUTE ON FUNCTION public.reset_author_list(TEXT, TEXT) TO authenticated;
