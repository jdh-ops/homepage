// 계정(닉네임 + 비밀번호)과 서버 세이브. Supabase 사용.
// anon key 는 브라우저에 공개되는 키예요. 데이터는 RLS 로 본인 것만 읽고 쓸 수 있어요 (supabase/game_saves.sql).
const SUPABASE_URL = "https://lirxlbbbmqcsbnjnyqkg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpcnhsYmJibXFjc2Juam55cWtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MDk2MTIsImV4cCI6MjA4MjE4NTYxMn0.06V04-rJsbChPIGUJQemxZH6Ss16vArJRKGyQejf_JE";
// 닉네임을 Supabase 로그인용 가짜 이메일로 바꿀 때 쓰는 도메인 (메일은 보내지 않음)
const EMAIL_DOMAIN = "players.wegofair.xyz";

export const NICK_RULE = "닉네임은 2~10자, 한글·영문·숫자·_ 만 쓸 수 있어요.";
export const PW_MIN = 6;

export function checkNickname(nick) {
  return /^[0-9A-Za-z가-힣_]{2,10}$/.test(nick);
}

/** 닉네임 → 로그인용 이메일 (영문 대소문자 구분 없음, 한글은 UTF-8 16진수) */
function nickToEmail(nick) {
  const bytes = new TextEncoder().encode(nick.trim().toLowerCase());
  return "p" + [...bytes].map((b) => b.toString(16).padStart(2, "0")).join("") + "@" + EMAIL_DOMAIN;
}

let sb = null;
function client() {
  if (!sb) sb = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, storageKey: "witch-potion-auth" },
  });
  return sb;
}

const mock = () => window.__cloudMock; // 테스트용 가짜 서버

function toAccount(user) {
  return user ? { id: user.id, nickname: user.user_metadata?.nickname || "?", createdAt: user.created_at } : null;
}

function friendly(error) {
  const m = (error?.message || "").toLowerCase();
  if (m.includes("already registered") || m.includes("already been registered")) return "이미 있는 닉네임이에요.";
  if (m.includes("invalid login credentials")) return "닉네임 또는 비밀번호가 틀려요.";
  if (m.includes("password")) return `비밀번호는 ${PW_MIN}자 이상이어야 해요.`;
  if (m.includes("fetch") || m.includes("network")) return "서버에 연결할 수 없어요. 인터넷 연결을 확인해 주세요.";
  return "문제가 생겼어요: " + (error?.message || "알 수 없는 오류");
}

export async function getAccount() {
  if (mock()) return mock().getAccount();
  const { data } = await client().auth.getSession();
  return toAccount(data.session?.user);
}

export async function signUp(nick, password) {
  if (mock()) return mock().signUp(nick, password);
  const { data, error } = await client().auth.signUp({
    email: nickToEmail(nick), password, options: { data: { nickname: nick.trim() } },
  });
  if (error) throw new Error(friendly(error));
  // 이메일 확인이 켜져 있으면 세션이 없음 → 관리자 설정 필요
  if (!data.session) throw new Error("가입은 됐지만 바로 로그인되지 않았어요. (관리자: Supabase 이메일 확인 끄기 필요)");
  return toAccount(data.user);
}

export async function signIn(nick, password) {
  if (mock()) return mock().signIn(nick, password);
  const { data, error } = await client().auth.signInWithPassword({ email: nickToEmail(nick), password });
  if (error) throw new Error(friendly(error));
  return toAccount(data.user);
}

export async function signOut() {
  if (mock()) return mock().signOut();
  await client().auth.signOut();
}

/** 서버 세이브 { data, updatedAt } 또는 null */
export async function loadSave() {
  if (mock()) return mock().loadSave();
  const { data, error } = await client().from("game_saves").select("data, updated_at").maybeSingle();
  if (error) throw new Error(friendly(error));
  return data ? { data: data.data, updatedAt: Date.parse(data.updated_at) } : null;
}

export async function writeSave(account, data, updatedAt) {
  if (mock()) return mock().writeSave(account, data, updatedAt);
  const { error } = await client().from("game_saves").upsert({
    user_id: account.id, nickname: account.nickname, data, updated_at: new Date(updatedAt).toISOString(),
  });
  if (error) throw new Error(friendly(error));
}

/** 페이지를 닫을 때: 응답을 기다리지 않고 보냄 */
export async function writeSaveOnExit(account, data, updatedAt) {
  if (mock()) return mock().writeSave(account, data, updatedAt);
  const { data: s } = await client().auth.getSession();
  const token = s.session?.access_token;
  if (!token) return;
  fetch(`${SUPABASE_URL}/rest/v1/game_saves?on_conflict=user_id`, {
    method: "POST",
    keepalive: true,
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      Prefer: "resolution=merge-duplicates,return=minimal",
    },
    body: JSON.stringify({ user_id: account.id, nickname: account.nickname, data, updated_at: new Date(updatedAt).toISOString() }),
  }).catch(() => {});
}

export async function deleteAccount() {
  if (mock()) return mock().deleteAccount();
  const { error } = await client().rpc("delete_my_account");
  if (error) throw new Error(friendly(error));
  await client().auth.signOut();
}
