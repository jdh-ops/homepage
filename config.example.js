// config.js 가 없으면: cp config.example.js config.js 후 anon key 입력
// Supabase anon key 는 브라우저에 노출되는 공개 키입니다(RLS 로 보호). GitHub Pages 배포에 config.js 필요.
window.APP_CONFIG = {
  supabaseUrl: "https://lirxlbbbmqcsbnjnyqkg.supabase.co",
  supabaseAnonKey: "YOUR_ANON_KEY",
  // 화면에 보일 열 순서 (DB 컬럼명)
  displayColumns: ["col_1", "col_5", "col_10", "tag", "col_2"],
  // 표시 열 너비 비율 (선택 · ID · displayColumns 순)
  columnWidthPercents: [3, 5, 10, 49, 12, 13, 8],
};
