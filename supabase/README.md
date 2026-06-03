# 데이터 확인 페이지 (Supabase)

## 1. DB 마이그레이션

Supabase 대시보드 **SQL Editor**에서 실행:

- `migrations/20250603000000_dataset_records.sql`
- `migrations/20250603000001_dataset_records_anon_write.sql` ← **엑셀 업로드 필수**
- `migrations/20250603000002_add_tag_column.sql` ← (구버전 tag 컬럼, 선택)
- `migrations/20250603000004_dataset_record_meta.sql` ← **분류·태그·상태·메모 (필수)**
- `migrations/20250603000006_dataset_authors.sql` ← **작성자 블랙/화이트 리스트·일괄 분류**
- `migrations/20250603000007_dataset_authors_musi.sql` ← **작성자 ‘무시’ 추가** (06 실행 후)
- `migrations/20250603000008_dataset_authors_platform.sql` ← **플랫폼+작성자 복합 키** (06·07 실행 후)
- `migrations/20250603000009_reset_author_list.sql` ← **작성자 관리 초기화(삭제)**
- `migrations/20250603000010_upload_url_dedup_author_category.sql` ← **URL 중복·신규행 분류 자동**
- `migrations/20250603000011_find_existing_col4_urls_rpc.sql` ← **업로드 URL 중복 확인(PostgREST GET 한도 회피)**

또는 CLI:

```bash
supabase db push
```

테이블 `dataset_records`: `col_1` ~ `col_10`, `id`, `created_at`

## 2. 시크릿 (업로드 API 보호, 권장)

### 방법 A — CLI (토큰이 정상일 때)

```powershell
supabase.cmd secrets set --project-ref lirxlbbbmqcsbnjnyqkg "DATA_IMPORT_SECRET=강한_랜덤_문자열"
```

### 방법 B — 대시보드 (CLI `Access token not provided` 일 때 권장)

1. [프로젝트](https://supabase.com/dashboard/project/lirxlbbbmqcsbnjnyqkg) → **Project Settings** → **Edge Functions** → **Secrets**
2. **New secret**  
   - Name: `DATA_IMPORT_SECRET`  
   - Value: 본인이 정한 비밀 문자열  
3. `config.js`의 `dataImportKey`에 **같은 값** 입력

설정하지 않으면 서버에서 `X-Import-Key` 검사는 생략됩니다(개발용).

## 3. Edge Function 배포

### 방법 A — CLI

`supabase login` 후에도 `projects list`가 실패하면, [Account → Access Tokens](https://supabase.com/dashboard/account/tokens)에서 토큰을 만든 뒤:

```powershell
$env:SUPABASE_ACCESS_TOKEN="sbp_여기에_토큰"
cd "C:\Users\jdh04\OneDrive\문서\GitHub\homepage"
supabase.cmd functions deploy data-import --no-verify-jwt
```

### 방법 B — 대시보드

1. **Edge Functions** → **Deploy a new function** (또는 New function)
2. 이름: `data-import`
3. `supabase/functions/data-import/index.ts` 내용 전체 붙여넣기 → Deploy
4. 함수 설정에서 **Verify JWT 끄기** (`--no-verify-jwt`와 동일)

## 4. 프론트 설정

```bash
cp config.example.js config.js
```

`config.js`에 다음을 입력 ( **GitHub Pages 배포 시 `config.js` 를 저장소에 포함** — anon key 는 공개 키이며 RLS 로 보호):

- `supabaseUrl`, `supabaseAnonKey` (대시보드 → Settings → API)
- `dataImportUrl`: `https://lirxlbbbmqcsbnjnyqkg.supabase.co/functions/v1/data-import`
- `dataImportKey`: `DATA_IMPORT_SECRET`과 동일 (시크릿을 쓴 경우)

## 5. 로컬에서 페이지 열기

정적 파일만 있으므로 로컬 서버로 여는 것을 권장합니다.

```bash
npx serve .
```

브라우저에서 `http://localhost:3000/data.html`

## 동작 요약

| 동작 | 경로 |
|------|------|
| DB 조회 | 브라우저 → Supabase anon → `dataset_records` SELECT |
| 엑셀 업로드 | 브라우저 → Supabase REST `insert` (anon, RLS 정책 필요) |

엑셀: 첫 시트, A~J = col_1~col_10. 1행이 헤더면 자동 스킵.

## CORS 오류 (`preflight doesn't pass access control`)

대시보드에서 함수를 배포했을 때 **Verify JWT / Enforce JWT** 가 켜져 있으면 OPTIONS 가 401 이 되어 브라우저가 CORS 로 막습니다.

1. [Edge Functions](https://supabase.com/dashboard/project/lirxlbbbmqcsbnjnyqkg/functions) → `data-import`
2. **Verify JWT 끄기** (비활성화) 후 저장·재배포
3. CLI 재배포 시: `supabase.cmd functions deploy data-import --no-verify-jwt`  
   (`supabase/config.toml` 에 `verify_jwt = false` 포함됨)

함수가 아예 없으면 404 로 같은 증상이 날 수 있으니, Functions 목록에 `data-import` 가 있는지 확인하세요.
