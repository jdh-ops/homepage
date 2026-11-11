// 게임 계정(닉네임 + 비밀번호)과 서버 세이브.
// Supabase 데이터베이스 함수(supabase/game.sql)를 직접 부름. Supabase Auth 는 쓰지 않음.
// anon key 는 브라우저에 공개되는 키예요. 표는 직접 못 읽고, 함수로만 본인 데이터에 접근해요.
const SUPABASE_URL = "https://lirxlbbbmqcsbnjnyqkg.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxpcnhsYmJibXFjc2Juam55cWtnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjY2MDk2MTIsImV4cCI6MjA4MjE4NTYxMn0.06V04-rJsbChPIGUJQemxZH6Ss16vArJRKGyQejf_JE";
const TOKEN_KEY = "witch-potion-token";

export const NICK_RULE = "닉네임은 2~10자, 한글·영문·숫자·_ 만 쓸 수 있어요.";
export const PW_MIN = 6;
export const INACTIVE_DAYS = 7; // 마지막 접속 후 이만큼 지나면 서버가 계정 삭제

export function checkNickname(nick) {
  return /^[0-9A-Za-z가-힣_]{2,10}$/.test(nick);
}

const mock = () => window.__cloudMock; // 테스트용 가짜 서버

const MESSAGES = {
  nickname_taken: "이미 있는 닉네임이에요.",
  invalid_login: "닉네임 또는 비밀번호가 틀려요.",
  bad_nickname: NICK_RULE,
  bad_password: `비밀번호는 ${PW_MIN}자 이상이어야 해요.`,
  invalid_session: "다른 곳에서 로그인해서(또는 로그인이 만료돼서) 로그아웃됐어요.",
  save_too_large: "세이브가 너무 커요.",
};

function getToken() { try { return localStorage.getItem(TOKEN_KEY); } catch { return null; } }
function setToken(t) { try { t ? localStorage.setItem(TOKEN_KEY, t) : localStorage.removeItem(TOKEN_KEY); } catch { /* 무시 */ } }

async function rpc(fn, args, opts = {}) {
  let res;
  try {
    res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
      method: "POST",
      keepalive: !!opts.keepalive,
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(args),
    });
  } catch {
    throw Object.assign(new Error("서버에 연결할 수 없어요. 인터넷 연결을 확인해 주세요."), { code: "network" });
  }
  const text = await res.text();
  const body = text ? JSON.parse(text) : null;
  if (!res.ok) {
    const code = Object.keys(MESSAGES).find((k) => (body?.message || "").includes(k)) || "unknown";
    throw Object.assign(new Error(MESSAGES[code] || "문제가 생겼어요: " + (body?.message || res.status)), { code });
  }
  return body;
}

// ---------- 세이브 압축 (gzip → base64). 약 13KB → 약 8KB ----------
async function gzipJson(obj) {
  if (typeof CompressionStream === "undefined") return obj; // 오래된 브라우저: 그대로
  const stream = new Blob([JSON.stringify(obj)]).stream().pipeThrough(new CompressionStream("gzip"));
  const buf = new Uint8Array(await new Response(stream).arrayBuffer());
  let bin = "";
  for (let i = 0; i < buf.length; i += 0x8000) bin += String.fromCharCode(...buf.subarray(i, i + 0x8000));
  return { z: btoa(bin) };
}

async function gunzipJson(data) {
  if (!data?.z) return data;
  const bytes = Uint8Array.from(atob(data.z), (c) => c.charCodeAt(0));
  const stream = new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"));
  return JSON.parse(await new Response(stream).text());
}

const toAccount = (a) => a && { id: a.id, nickname: a.nickname, createdAt: a.created_at, lastSeen: a.last_seen };

/** 저장된 로그인으로 계정 정보. 만료됐으면 null */
export async function getAccount() {
  if (mock()) return mock().getAccount();
  const token = getToken();
  if (!token) return null;
  try {
    return toAccount(await rpc("game_session", { p_token: token }));
  } catch (e) {
    if (e.code === "invalid_session") { setToken(null); return null; }
    throw e;
  }
}

export async function signUp(nick, password) {
  if (mock()) return mock().signUp(nick, password);
  const r = await rpc("game_sign_up", { p_nick: nick, p_pw: password });
  setToken(r.token);
  return toAccount(r.account);
}

export async function signIn(nick, password) {
  if (mock()) return mock().signIn(nick, password);
  const r = await rpc("game_sign_in", { p_nick: nick, p_pw: password });
  setToken(r.token);
  return toAccount(r.account);
}

export async function signOut() {
  if (mock()) return mock().signOut();
  const token = getToken();
  setToken(null);
  if (token) await rpc("game_sign_out", { p_token: token }).catch(() => {});
}

/** 서버 세이브 { data, updatedAt } 또는 null */
export async function loadSave() {
  if (mock()) return mock().loadSave();
  const r = await rpc("game_load", { p_token: getToken() });
  return r ? { data: await gunzipJson(r.data), updatedAt: Date.parse(r.updated_at) } : null;
}

export async function writeSave(account, data, updatedAt) {
  if (mock()) return mock().writeSave(account, data, updatedAt);
  await rpc("game_save", { p_token: getToken(), p_data: await gzipJson(data), p_updated_at: new Date(updatedAt).toISOString() });
}

/** 페이지를 닫을 때: 응답을 기다리지 않고 보냄 (압축은 비동기라 기다릴 수 없어서 그대로 보냄) */
export function writeSaveOnExit(account, data, updatedAt) {
  if (mock()) return mock().writeSave(account, data, updatedAt);
  rpc("game_save", { p_token: getToken(), p_data: data, p_updated_at: new Date(updatedAt).toISOString() }, { keepalive: true })
    .catch(() => {});
}

export async function deleteAccount() {
  if (mock()) return mock().deleteAccount();
  await rpc("game_delete_account", { p_token: getToken() });
  setToken(null);
}
