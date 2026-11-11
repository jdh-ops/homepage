-- 마녀의 물약 정리: 게임 전용 계정(닉네임 + 비밀번호) · 세이브 · 7일 미접속 자동 삭제
-- Supabase 대시보드 → SQL Editor 에 전체를 붙여 넣고 Run. 여러 번 실행해도 안전해요.
-- Supabase Auth(이메일 로그인)는 쓰지 않아요 → 프로젝트의 이메일 확인 설정과 무관해요.

-- 이전 버전(Supabase Auth 방식)에서 만든 것 정리
drop function if exists public.delete_my_account();
drop table if exists public.game_saves;

create extension if not exists pgcrypto with schema extensions;

create table if not exists public.players (
  id         uuid primary key default gen_random_uuid(),
  nickname   text not null,
  nick_key   text not null unique,              -- 대소문자 구분 없는 닉네임
  pw_hash    text not null,                     -- bcrypt 해시 (원래 비밀번호는 저장 안 함)
  created_at timestamptz not null default now(),
  last_seen  timestamptz not null default now() -- 마지막 접속 (7일 지나면 자동 삭제)
);

create table if not exists public.player_sessions (
  token      uuid primary key default gen_random_uuid(),
  player_id  uuid not null references public.players (id) on delete cascade,
  created_at timestamptz not null default now()
);

create table if not exists public.player_saves (
  player_id  uuid primary key references public.players (id) on delete cascade,
  data       jsonb not null,
  updated_at timestamptz not null default now()
);

-- 표는 브라우저에서 직접 읽고 쓸 수 없음 (정책 없음). 아래 함수로만 접근.
alter table public.players enable row level security;
alter table public.player_sessions enable row level security;
alter table public.player_saves enable row level security;
revoke all on public.players, public.player_sessions, public.player_saves from anon, authenticated;

-- 7일 넘게 접속하지 않은 계정 삭제 (세션·세이브도 같이 삭제). 로그인·저장할 때마다 실행됨
create or replace function public.game_cleanup()
returns void language sql security definer set search_path = public as $$
  delete from public.players where last_seen < now() - interval '7 days';
$$;

create or replace function public.game_account_json(p public.players)
returns json language sql stable as $$
  select json_build_object('id', p.id, 'nickname', p.nickname, 'created_at', p.created_at, 'last_seen', p.last_seen);
$$;

-- 세션 토큰 → 계정 (접속 시각 갱신). 없으면 오류
create or replace function public.game_player(p_token uuid)
returns public.players language plpgsql security definer set search_path = public as $$
declare p public.players;
begin
  perform public.game_cleanup();
  select pl.* into p from public.player_sessions s join public.players pl on pl.id = s.player_id where s.token = p_token;
  if not found then raise exception 'invalid_session'; end if;
  update public.players set last_seen = now() where id = p.id returning * into p;
  return p;
end;
$$;

create or replace function public.game_sign_up(p_nick text, p_pw text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare p public.players; t uuid;
begin
  perform public.game_cleanup();
  p_nick := btrim(p_nick);
  if p_nick !~ '^[0-9A-Za-z가-힣_]{2,10}$' then raise exception 'bad_nickname'; end if;
  if length(p_pw) < 6 then raise exception 'bad_password'; end if;
  begin
    insert into public.players (nickname, nick_key, pw_hash)
    values (p_nick, lower(p_nick), crypt(p_pw, gen_salt('bf'))) returning * into p;
  exception when unique_violation then
    raise exception 'nickname_taken';
  end;
  insert into public.player_sessions (player_id) values (p.id) returning token into t;
  return json_build_object('token', t, 'account', public.game_account_json(p));
end;
$$;

create or replace function public.game_sign_in(p_nick text, p_pw text)
returns json language plpgsql security definer set search_path = public, extensions as $$
declare p public.players; t uuid;
begin
  perform public.game_cleanup();
  select * into p from public.players where nick_key = lower(btrim(p_nick));
  if not found or p.pw_hash <> crypt(p_pw, p.pw_hash) then raise exception 'invalid_login'; end if;
  update public.players set last_seen = now() where id = p.id returning * into p;
  -- 한 계정은 한 곳에서만: 다른 기기의 로그인은 끊음 (그 기기는 다음 저장 때 로그인 화면으로)
  delete from public.player_sessions where player_id = p.id;
  insert into public.player_sessions (player_id) values (p.id) returning token into t;
  return json_build_object('token', t, 'account', public.game_account_json(p));
end;
$$;

create or replace function public.game_session(p_token uuid)
returns json language plpgsql security definer set search_path = public as $$
begin
  return public.game_account_json(public.game_player(p_token));
end;
$$;

create or replace function public.game_sign_out(p_token uuid)
returns void language sql security definer set search_path = public as $$
  delete from public.player_sessions where token = p_token;
$$;

create or replace function public.game_load(p_token uuid)
returns json language plpgsql security definer set search_path = public as $$
declare p public.players; s public.player_saves;
begin
  p := public.game_player(p_token);
  select * into s from public.player_saves where player_id = p.id;
  if not found then return null; end if;
  return json_build_object('data', s.data, 'updated_at', s.updated_at);
end;
$$;

create or replace function public.game_save(p_token uuid, p_data jsonb, p_updated_at timestamptz)
returns void language plpgsql security definer set search_path = public as $$
declare p public.players;
begin
  p := public.game_player(p_token);
  if octet_length(p_data::text) > 200000 then raise exception 'save_too_large'; end if;
  insert into public.player_saves (player_id, data, updated_at) values (p.id, p_data, p_updated_at)
  on conflict (player_id) do update set data = excluded.data, updated_at = excluded.updated_at;
end;
$$;

create or replace function public.game_delete_account(p_token uuid)
returns void language plpgsql security definer set search_path = public as $$
declare p public.players;
begin
  p := public.game_player(p_token);
  delete from public.players where id = p.id;
end;
$$;

-- 브라우저(anon)는 아래 함수만 부를 수 있음
revoke all on function public.game_cleanup(), public.game_player(uuid), public.game_account_json(public.players) from public, anon, authenticated;
grant execute on function
  public.game_sign_up(text, text), public.game_sign_in(text, text), public.game_session(uuid),
  public.game_sign_out(uuid), public.game_load(uuid), public.game_save(uuid, jsonb, timestamptz),
  public.game_delete_account(uuid)
to anon;
