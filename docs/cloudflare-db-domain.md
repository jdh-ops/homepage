# db.wegofair.xyz → GitHub Pages (URL 유지)

브라우저 주소창은 `https://db.wegofair.xyz` 로 유지되고, 저장소의 `index.html`(데이터 확인 화면)이 표시됩니다.  
`jdh-ops.github.io` 주소로 **리다이렉트하지 않습니다.**

## 1. GitHub (저장소)

1. https://github.com/jdh-ops/homepage → **Settings** → **Pages**
2. **Custom domain**에 `db.wegofair.xyz` 입력 → Save  
   (저장소 루트 `CNAME` 파일과 동일하면 자동 인식)
3. **Enforce HTTPS** 켜기 (인증서 발급 후, 보통 수십 분~24시간)

## 2. Cloudflare (wegofair.xyz)

**DNS** → 레코드 추가:

| Type | Name | Target | Proxy |
|------|------|--------|-------|
| CNAME | `db` | `jdh-ops.github.io` | Proxied(주황) 또는 DNS only(회색) |

- **Proxied**: Cloudflare CDN·DDoS. SSL은 **Full** 또는 **Full (strict)** 권장.  
  처음 GitHub 인증서가 안 뜨면 잠시 **DNS only**로 두고 GitHub에서 HTTPS 확인 후 Proxied 전환.
- **DNS only**: GitHub가 직접 인증서 발급하기 쉬움.

**SSL/TLS** → 암호화 모드: **Full** (GitHub Pages는 사용자 인증서 제공)

**Page Rules / Redirect Rules**로 `github.io`로 보내는 규칙이 있으면 **삭제**하세요. (URL이 바뀝니다)

## 3. 확인

```text
nslookup db.wegofair.xyz
```

- GitHub Pages 배포 완료 후: https://db.wegofair.xyz/  
- 예전 링크: https://db.wegofair.xyz/data.html → `/` 로만 이동 (같은 사이트)

## 4. Supabase (선택)

Auth **Redirect URLs**에 `https://db.wegofair.xyz/**` 추가가 필요할 때만 설정합니다.  
현재 앱은 anon key + RLS만 사용하면 필수는 아닙니다.
