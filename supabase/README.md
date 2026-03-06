# 어드민 보안 강화 설정

## 1. DB 마이그레이션 실행

Supabase 대시보드 **SQL Editor**에서 아래 순서로 실행하세요.

1. **admin_auth 테이블**  
   `migrations/20250303000000_admin_auth.sql` 파일 내용 전체 실행  
   → 초기 비밀번호는 `admin`입니다. 배포 후 반드시 변경하세요.

2. **homepage_content RLS**  
   `migrations/20250303000001_homepage_content_rls.sql` 파일 내용 전체 실행  
   → 읽기는 그대로, 쓰기는 Edge Function을 통해서만 가능해집니다.

이미 `supabase` CLI로 연결된 프로젝트라면:

```bash
supabase db push
```

## 2. 시크릿 설정

Edge Function에서 사용할 JWT 서명용 비밀값을 설정합니다.

**대시보드:** Project Settings → Edge Functions → Secrets  
**또는 CLI:**

```bash
supabase secrets set ADMIN_JWT_SECRET=여기에_강한_랜덤_문자열_32자_이상
```

`ADMIN_JWT_SECRET`은 32자 이상의 예측 불가능한 문자열로 설정하세요.

## 3. Edge Function 배포

두 함수 모두 **커스텀 JWT**를 쓰므로 `--no-verify-jwt`로 배포합니다.

```bash
supabase functions deploy admin-login --no-verify-jwt
supabase functions deploy admin-save --no-verify-jwt
```

프로젝트가 연결되어 있지 않다면:

```bash
supabase link --project-ref 프로젝트_참조_ID
```

## 4. 비밀번호 변경

DB에서 직접 해시만 바꿉니다. SQL Editor에서 실행 (원하는 비밀번호로 수정):

```sql
UPDATE admin_auth
SET password_hash = crypt('새비밀번호', gen_salt('bf')), updated_at = now()
WHERE id = 1;
```

---

## 동작 요약

- **로그인:** 브라우저 → `admin-login` (비밀번호 전달) → DB의 해시와 비교 → JWT 발급 → `sessionStorage`에 토큰 저장  
- **저장:** 브라우저 → `admin-save` (Authorization: Bearer JWT, body.data) → JWT 검증 → service_role로 `homepage_content` 업데이트  
- **인덱스 페이지:** 기존처럼 anon으로 `homepage_content` **읽기만** 하므로 변경 없음.
