// 게임 전체에서 쓰는 고정 수치. 밸런스 조정은 여기서.

export const COLORS = [
  { key: "red", name: "빨강", hex: "#e5484d" },
  { key: "orange", name: "주황", hex: "#f5893a" },
  { key: "yellow", name: "노랑", hex: "#f2cc3a" },
  { key: "green", name: "초록", hex: "#3fb760" },
  { key: "blue", name: "파랑", hex: "#3e9bfa" },
  { key: "indigo", name: "남색", hex: "#4146c4" },
  { key: "violet", name: "보라", hex: "#a160e8" },
];
export const DAYS = ["월", "화", "수", "목", "금", "토", "일"];
export const DAYS_HANJA = ["月", "火", "水", "木", "金", "土", "日"]; // 약병 라벨용

export const UNITS_PER_BOTTLE = 4;
export const BOTTLES_PER_LABEL = 30;            // 색-요일 조합마다 30병 → 7×7×30 = 1470
export const SHELF_ROWS = 30;
export const BREWERY_COUNT = 5;                 // 조제실 5곳, 294병씩
// 조제실 창고 (물리 엔진 단위. 화면 너비에 맞춰 확대해서 그림)
export const FLOOR_W = 900;
export const FLOOR_H = 620;                     // 화면보다 깊어서 세로 스크롤
export const BOTTLE_W = 24;
export const BOTTLE_H = 46;

// ---------- 경험치 / 레벨 ----------
// 선반 한 행(7병)을 오류 없이 채우면 경험치 ROW_XP(=1). 즉 경험치 = 완성한 행 수.
// 행 1개 = 1레벨 업. 116행을 채우면 만렙.
// 레벨업마다 스킬 포인트 1개. 만렙까지 받는 포인트로 모든 스킬을 5레벨까지 찍을 수 있게:
//   처음부터 1레벨인 스킬 3개 × 16포인트 + 0레벨에서 시작하는 스킬 4개 × 17포인트 = 116 → 만렙 117
//   (스킬 구성이 바뀌면 아래 SKILLS 뒤의 검사가 콘솔에 알려 줌)
export const ROW_XP = 1;
export const MAX_LEVEL = 117;
export const MAX_LEVEL_ROWS = 116;
const TOTAL_XP = ROW_XP * MAX_LEVEL_ROWS;
const XP_CURVE = 1; // 1 = 한 행마다 1레벨. 1보다 크면 뒤로 갈수록 레벨업이 어려워짐

/** 레벨 L에 도달하는 데 필요한 누적 경험치 */
export function xpForLevel(level) {
  if (level <= 1) return 0;
  return Math.round(TOTAL_XP * Math.pow((level - 1) / (MAX_LEVEL - 1), XP_CURVE));
}

export function levelFromXp(xp) {
  let lv = 1;
  while (lv < MAX_LEVEL && xpForLevel(lv + 1) <= xp) lv++;
  return lv;
}

// ---------- 테스트용 ----------
// 임시: 이 레벨보다 낮으면 이 레벨로 올려서 시작 (기존 세이브 포함). 정식 버전에서는 1로.
export const TEST_START_LEVEL = 20;

// ---------- 구역 해금 ----------
export const ZONE3_LEVEL = 5;
export const ZONE4_LEVEL = Math.floor(MAX_LEVEL / 5 / 10) * 10; // 만렙의 1/5(23.4), 1의 자리 버림 → 20

// ---------- 스킬 ----------
// 최대 5레벨. SKILL_COSTS[지금 레벨] = 다음 레벨로 올리는 비용
//   0→1: 1 (0레벨 시작 스킬만), 1→2: 1, 2→3: 3, 3→4: 5, 4→5: 7
// start: 0이면 포인트를 찍어야 쓸 수 있음. unlock: 이 레벨부터 포인트를 찍을 수 있음
export const SKILL_COSTS = [1, 1, 3, 5, 7];
export const SKILL_MAX = 5;

export const SKILLS = [
  { id: "inventory", name: "인벤토리", desc: "들고 다닐 수 있는 병 수", values: [4, 6, 8, 10, 12], unit: "개", unlock: 1 },
  { id: "flasks", name: "플라스크", desc: "작업실 1구역 플라스크 수", values: [5, 10, 15, 22, 30], unit: "개", unlock: 1 },
  { id: "rack", name: "거치대", desc: "작업실 2구역 거치대 수", values: [5, 10, 15, 22, 30], unit: "칸", unlock: 1 },
  { id: "drum", name: "물통", desc: "작업실 3구역 물통 크기와 개수", values: [12, 17, 22, 27, 32], unit: "칸",
    extra: { name: "개수", values: [2, 3, 4, 5, 6], unit: "개" }, unlock: ZONE3_LEVEL, start: 0 },
  { id: "sorterCap", name: "분류기", desc: "작업실 4구역 분류기 저장 칸 수와 주입기(밸브) 수", values: [12, 24, 36, 48, 60], unit: "칸",
    extra: { name: "주입기", values: [3, 3, 4, 4, 5], unit: "개" }, unlock: ZONE4_LEVEL, start: 0 },
  {
    id: "summon", name: "부름", active: true, unlock: 1, start: 0,
    desc: "들고 있는 약병과 같은 라벨 색의 약병을 같은 방 바닥에서 인벤토리로 불러옴",
    values: [2, 3, 4, 5, 6], unit: "병", cooldown: [20, 15, 12, 8, 5],
  },
  {
    id: "autoShelve", name: "자동 진열", active: true, unlock: 1, start: 0,
    desc: "지속시간 동안, 열어 둔 선반에 맞는 완성 약병을 인벤토리에서 꺼내 제자리에 넣음",
    values: [10, 15, 20, 25, 30], unit: "초", cooldown: [20, 15, 12, 8, 5],
  },
];

/** 스킬을 처음 레벨부터 5레벨까지 올리는 데 드는 포인트 */
export function skillTotalCost(s) {
  let sum = 0;
  for (let l = s.start ?? 1; l < SKILL_MAX; l++) sum += SKILL_COSTS[l];
  return sum;
}
if (SKILLS.reduce((a, s) => a + skillTotalCost(s), 0) !== MAX_LEVEL - 1) {
  console.warn("MAX_LEVEL이 스킬 총비용 + 1과 다릅니다:", SKILLS.reduce((a, s) => a + skillTotalCost(s), 0) + 1);
}

export const MAX_FLASKS = 30;
export const MAX_RACK = 30;
export const MAX_DRUMS = 6;
export const MAX_INVENTORY = 12;
export const SORTER_INJECTORS = 5;
export const SORTER_IDLE_MS = 1000; // 밸브를 이만큼 안 누르면 분류기가 병을 채워 줌

// ---------- 붓기 시간 (ms) ----------
export const POUR_BASE_MS = 300;
export const POUR_PER_UNIT_MS = 110;
export const INVENTORY_POUR_FACTOR = 2; // 인벤토리 안에서 부을 때는 2배

export const SAVE_KEY = "witch-potion-save-v1";
