-- 업로드 시 URL 중복 확인: GET .in() 쿼리 문자열 한도 회피 (POST RPC)
CREATE OR REPLACE FUNCTION public.find_existing_col4_urls(urls text[])
RETURNS TABLE(col_4 text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT DISTINCT r.col_4
  FROM dataset_records r
  WHERE r.col_4 IS NOT NULL
    AND trim(r.col_4) <> ''
    AND r.col_4 = ANY(urls);
$$;

GRANT EXECUTE ON FUNCTION public.find_existing_col4_urls(text[]) TO anon, authenticated, service_role;
