# 계정·세이브 서버 설정 (Supabase)

게임은 Supabase 프로젝트 `lirxlbbbmqcsbnjnyqkg`의 **데이터베이스**에 계정과 세이브를 저장해요.
Supabase의 로그인 기능(Auth, 이메일 확인 등)은 **쓰지 않아요**. 그래서 같은 프로젝트를 쓰는 다른 사이트의 이메일 확인 설정이나 회원 목록에 영향이 없어요.

## 설정 (한 번만)

1. [Supabase 대시보드](https://supabase.com/dashboard/project/lirxlbbbmqcsbnjnyqkg) → 왼쪽 **SQL Editor**
2. `supabase/game.sql` 내용을 전부 붙여 넣고 **Run**

여러 번 실행해도 안전해요. 이전 버전 SQL(`game_saves`, `delete_my_account`)로 만든 것은 자동으로 지워요.

## 만들어지는 것

| 이름 | 내용 |
|---|---|
| `players` | 닉네임, 비밀번호 해시(bcrypt), 가입일, 마지막 접속 |
| `player_sessions` | 로그인 상태(토큰) |
| `player_saves` | 계정당 세이브 1개 (약 13KB) |
| `game_sign_up`, `game_sign_in`, `game_session`, `game_sign_out`, `game_load`, `game_save`, `game_delete_account` | 브라우저가 부르는 함수 |

- 표는 브라우저에서 직접 읽거나 쓸 수 없고, 위 함수로만 **본인 데이터**에 접근해요.
- 비밀번호는 원래 값을 저장하지 않아요(되돌릴 수 없는 해시만 저장).

## 7일 미접속 자동 삭제

- 로그인하거나 저장할 때마다 `last_seen`(마지막 접속)이 갱신돼요.
- 누군가 로그인·가입·저장할 때마다 **마지막 접속이 7일 넘은 계정**을 지워요(세이브·로그인 상태도 같이).
- 기간을 바꾸려면 `game.sql`의 `interval '7 days'`와 `js/cloud.js`의 `INACTIVE_DAYS`를 같이 바꿔 주세요.

## 참고

- 무료 요금제는 1주일 동안 아무 요청이 없으면 프로젝트가 일시 정지될 수 있어요. 대시보드에서 다시 켜면 돼요.
- 예전 데이터 확인 페이지용 테이블(`dataset_records`, `dataset_record_meta`, `dataset_authors`)은 게임과 상관없어요. 다른 곳에서 쓰지 않으면 지워도 돼요.
