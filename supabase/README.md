# 계정·세이브 서버 설정 (Supabase)

게임은 Supabase 프로젝트 `lirxlbbbmqcsbnjnyqkg`에 계정과 세이브를 저장해요.
처음 한 번만 아래 두 가지를 해 주세요.

## 1. 세이브 테이블 만들기

1. [Supabase 대시보드](https://supabase.com/dashboard/project/lirxlbbbmqcsbnjnyqkg) → 왼쪽 **SQL Editor**
2. `supabase/game_saves.sql` 내용을 전부 붙여 넣고 **Run**

만들어지는 것:
- `game_saves` 테이블: 계정당 세이브 1개 (약 13KB). 본인 것만 읽고 쓸 수 있음(RLS)
- `delete_my_account()` 함수: 로그인한 본인 계정 삭제 (세이브도 같이 삭제)

## 2. 이메일 확인 끄기

닉네임으로 가입하기 때문에 실제 이메일이 없어요. 이메일 확인이 켜져 있으면 가입 후 로그인이 안 돼요.

- **Authentication** → **Sign In / Providers** → **Email**
- **Confirm email** 끄기 → Save
- (Email 공급자 자체는 켜져 있어야 해요)

## 참고

- 닉네임은 내부적으로 `p<닉네임의 16진수>@players.wegofair.xyz` 형태의 가짜 이메일로 바뀌어 Supabase Auth에 저장돼요. 메일은 보내지 않아요.
- 비밀번호는 Supabase가 암호화(해시)해서 저장해요. 메뉴의 "비밀번호 보이기"는 서버가 아니라 **그 기기에서 로그인할 때 브라우저에 기억해 둔 값**을 보여 주는 거예요.
- 무료 요금제는 1주일 동안 접속이 없으면 프로젝트가 일시 정지될 수 있어요. 정지되면 대시보드에서 다시 켜면 돼요. 그동안에도 게임은 그 기기 저장본으로 이어서 할 수 있어요.
- 예전 데이터 확인 페이지용 테이블(`dataset_records`, `dataset_record_meta`, `dataset_authors`)은 게임과 상관없어요. 필요 없으면 지워도 돼요.
