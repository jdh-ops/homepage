-- supabase/game.sql 로 만든 게임용 테이블·함수만 지우기 (잘못된 프로젝트에 실행했을 때 등)
-- 다른 테이블, Supabase 로그인(Auth) 정보에는 손대지 않아요.

-- 게임용으로 만든 함수 삭제
drop function if exists public.game_sign_up(text, text);
drop function if exists public.game_sign_in(text, text);
drop function if exists public.game_session(uuid);
drop function if exists public.game_sign_out(uuid);
drop function if exists public.game_load(uuid);
drop function if exists public.game_save(uuid, jsonb, timestamptz);
drop function if exists public.game_delete_account(uuid);
drop function if exists public.game_player(uuid);
drop function if exists public.game_account_json(public.players);
drop function if exists public.game_cleanup();

-- 게임용 테이블 삭제 (세이브 → 세션 → 계정 순서)
drop table if exists public.player_saves;
drop table if exists public.player_sessions;
drop table if exists public.players;

-- 처음 버전 SQL로 만든 것 (실행했었다면)
drop function if exists public.delete_my_account();
drop table if exists public.game_saves;

-- pgcrypto 확장은 Supabase 기본 설치라 지우지 않음
