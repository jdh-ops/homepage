-- 브라우저에서 엑셀 업로드 (Edge Function 없이, Supabase REST CORS 사용)
CREATE POLICY "allow_insert_dataset_records" ON dataset_records
  FOR INSERT WITH CHECK (true);

CREATE POLICY "allow_delete_dataset_records" ON dataset_records
  FOR DELETE USING (true);
