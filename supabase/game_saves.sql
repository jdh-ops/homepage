-- 마녀의 물약 정리: 계정별 세이브 (계정당 1개)
-- Supabase 대시보드 → SQL Editor 에 전체를 붙여 넣고 Run.
-- 여러 번 실행해도 안전합니다.

create table if not exists public.game_saves (
  user_id    uuid primary key references auth.users (id) on delete cascade,
  nickname   text not null,
  data       jsonb not null,          -- 압축 세이브 (v2, 약 15KB)
  updated_at timestamptz not null default now()
);

alter table public.game_saves enable row level security;

-- 자기 세이브만 읽고 쓸 수 있음
drop policy if exists "own save select" on public.game_saves;
drop policy if exists "own save insert" on public.game_saves;
drop policy if exists "own save update" on public.game_saves;
drop policy if exists "own save delete" on public.game_saves;
create policy "own save select" on public.game_saves for select using (auth.uid() = user_id);
create policy "own save insert" on public.game_saves for insert with check (auth.uid() = user_id);
create policy "own save update" on public.game_saves for update using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "own save delete" on public.game_saves for delete using (auth.uid() = user_id);

-- 계정 삭제: 로그인한 본인 계정만 지움 (세이브는 on delete cascade 로 같이 삭제)
create or replace function public.delete_my_account()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if auth.uid() is null then
    raise exception 'not signed in';
  end if;
  delete from auth.users where id = auth.uid();
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
