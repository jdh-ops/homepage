// 세이브 압축 형식 (v2). 한 명당 약 15~20KB.
// - 라벨(색·요일)은 저장하지 않고 시드로 다시 만든다.
// - 병 내용물은 병마다 4글자("0"~"6", 빈칸 ".")로 이어 붙인 문자열 하나.
// - 창고 바닥 병 위치는 저장하지 않는다(방에 들어갈 때 다시 쌓음).
import { COLORS, DAYS, SHELF_ROWS, UNITS_PER_BOTTLE } from "./config.js";
import { newGameState } from "./game.js";

const NC = COLORS.length, ND = DAYS.length;
const unitsStr = (u) => u.join("").padEnd(UNITS_PER_BOTTLE, ".");
const strUnits = (str) => [...str].filter((ch) => ch !== ".").map(Number);

export function encodeSave(s) {
  const shelf = []; // [칸 번호, 병 id, ...] (빈칸 생략)
  s.shelves.forEach((rows, c) => rows.forEach((row, r) => row.forEach((id, d) => {
    if (id != null) shelf.push((c * SHELF_ROWS + r) * ND + d, id);
  })));
  return {
    v: 2,
    seed: s.seed,
    u: s.items.map((it) => unitsStr(it.u)).join(""),
    fl: s.floor.map((list) => list.map((e) => e.id)),
    inv: s.inv,
    fk: s.flasks,
    rk: s.rack,
    dr: s.drums.map((d) => d.u.join("")),
    sj: s.sorter.inj,
    ss: s.sorter.store.join(""),
    sh: shelf,
    lr: s.lockedRows.map((rows) => rows.map((x) => (x ? 1 : 0)).join("")).join(""),
    sk: s.skills,
    room: s.room,
    ml: s.mapLocks || {},
    pt: Math.round(s.playMs || 0),
    ca: s.clearedAt || null,
  };
}

/** v2 세이브 → 게임 상태. v1(예전 형식, 전체 상태)이면 그대로 돌려줌 */
export function decodeSave(d) {
  if (!d) return null;
  if (d.v === 1) return d;
  if (d.v !== 2) return null;
  const s = newGameState(d.seed); // 라벨·플라스크 구성은 시드에서
  s.items.forEach((it, i) => { it.u = strUnits(d.u.slice(i * UNITS_PER_BOTTLE, (i + 1) * UNITS_PER_BOTTLE)); });
  s.floor = d.fl.map((ids) => ids.map((id) => ({ id, x: null, y: null, a: 0 })));
  s.inv = d.inv;
  s.flasks = d.fk;
  s.rack = d.rk;
  s.drums = d.dr.map((str) => ({ u: [...str].map(Number) }));
  s.sorter = { inj: d.sj, store: [...d.ss].map(Number) };
  s.shelves = Array.from({ length: NC }, () => Array.from({ length: SHELF_ROWS }, () => new Array(ND).fill(null)));
  for (let k = 0; k < d.sh.length; k += 2) {
    const cell = d.sh[k], id = d.sh[k + 1];
    const day = cell % ND, cr = (cell - day) / ND;
    s.shelves[Math.floor(cr / SHELF_ROWS)][cr % SHELF_ROWS][day] = id;
  }
  s.lockedRows = Array.from({ length: NC }, (_, c) =>
    [...d.lr.slice(c * SHELF_ROWS, (c + 1) * SHELF_ROWS)].map((ch) => ch === "1"));
  s.skills = d.sk;
  s.room = d.room;
  s.mapLocks = d.ml || {};
  s.playMs = d.pt || 0;
  s.clearedAt = d.ca || null;
  return s;
}
