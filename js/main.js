import {
  COLORS, DAYS, SKILLS, SKILL_MAX, MAX_LEVEL, xpForLevel, ZONE3_LEVEL, ZONE4_LEVEL,
  SHELF_ROWS, POUR_BASE_MS, POUR_PER_UNIT_MS, INVENTORY_POUR_FACTOR, BREWERY_COUNT, SORTER_IDLE_MS,
} from "./config.js";
import { Game, newGameState, sameLoc } from "./game.js";
import { $, h, vial, locKey, parseLoc, toast, delay } from "./ui/common.js";
import { createBreweryView } from "./ui/brewery.js";
import { renderWorkshop } from "./ui/workshop.js";
import { renderShelves } from "./ui/shelves.js";

let game = Game.load() || new Game(newGameState());

const ui = {
  sel: null,          // 선택한 위치
  busy: false,        // 붓는 중
  pouring: new Set(), // 붓는 중인 칸 key
  shelf: null,        // 크게 보고 있는 선반 색 번호 (null = 전체)
  pourMs: 0,
  sorterDue: 0,       // 분류기가 병을 채워 줄 시각 (0 = 대기 없음)
};

const ROOM_NAMES = {
  shelves: "선반",
  workshop: "작업실",
  ...Object.fromEntries(Array.from({ length: BREWERY_COUNT }, (_, i) => [`brewery${i}`, `조제실 ${i + 1}`])),
};

// ---------- 화면에 넘기는 도구 ----------
const ctx = {
  get game() { return game; },
  decorate(el, loc) {
    if (ui.sel && sameLoc(ui.sel, loc)) el.classList.add("selected");
    if (ui.pouring.has(locKey(loc))) {
      el.classList.add("pouring");
      el.style.setProperty("--dur", ui.pourMs + "ms");
    }
  },
  takeFromPile(room, id) {
    if (ui.busy) return;
    if (!game.takeFromPile(room, id)) toast("인벤토리가 가득 찼어요.");
  },
  saveSoon() { scheduleSave(); },
  dropToPile(room, pos) {
    if (ui.busy || !ui.sel) return;
    if (ui.sel.a !== "inv") { ui.sel = null; refresh(); return; }
    const it = game.item(game.itemAt(ui.sel));
    if (it?.t !== "b") { toast("플라스크는 바닥에 내려놓을 수 없어요."); return; }
    game.dropToPile(ui.sel, room, pos); // 다음 물약이 같은 자리로 당겨져 선택됨
    refresh();
  },
  openShelf(c) {
    ui.shelf = c;
    refresh();
    $("#view .zoom-scroll")?.scrollTo(0, 0);
  },
};

const breweryView = createBreweryView(ctx);

// ---------- 그리기 ----------
function refresh() {
  renderHud();
  renderInventory();
  renderRoom();
  renderInfo();
}

function renderHud() {
  const lv = game.level;
  const a = xpForLevel(lv), b = xpForLevel(lv + 1);
  $("#hudRoom").textContent = ROOM_NAMES[game.s.room];
  $("#hudLevel").textContent = lv >= MAX_LEVEL ? `Lv ${lv} (MAX)` : `Lv ${lv}`;
  $("#hudXpFill").style.width = lv >= MAX_LEVEL ? "100%" : `${((game.s.xp - a) / (b - a)) * 100}%`;
  $("#hudXpText").textContent = lv >= MAX_LEVEL ? `${game.s.xp} XP` : `${game.s.xp - a} / ${b - a} XP`;
  $("#hudRows").textContent = `${game.completedRows()}/${SHELF_ROWS * COLORS.length}`;
  const pts = game.skillPoints;
  const badge = $("#skillBadge");
  badge.textContent = pts;
  badge.hidden = pts <= 0;
}

function renderInventory() {
  const box = $("#invSlots");
  box.replaceChildren();
  for (let i = 0; i < game.invSize; i++) {
    const loc = { a: "inv", i };
    const id = game.itemAt(loc);
    const el = h("div", { class: "slot inv-slot", "data-loc": locKey(loc) });
    if (id != null) el.append(vial(game.item(id)));
    ctx.decorate(el, loc);
    box.append(el);
  }
  const used = game.s.inv.slice(0, game.invSize).filter((x) => x != null).length;
  $("#invCount").textContent = `${used}/${game.invSize}`;
}

let mountedRoom = null;
function renderRoom() {
  const view = $("#view");
  const room = game.s.room;
  if (room.startsWith("brewery")) {
    const r = +room.slice(7);
    if (mountedRoom !== room) { breweryView.mount(view, r); mountedRoom = room; }
    else breweryView.update();
    return;
  }
  if (mountedRoom?.startsWith("brewery")) breweryView.unmount();
  mountedRoom = room;
  const scroll = $("#view .zoom-scroll")?.scrollTop ?? 0;
  if (room === "workshop") view.replaceChildren(renderWorkshop(ctx));
  else if (room === "shelves") view.replaceChildren(renderShelves(ctx, ui.shelf));
  const sc = $("#view .zoom-scroll");
  if (sc) sc.scrollTop = scroll;
}

/** 선택한 병의 라벨만 (예: 주황 - 수) */
function describeSel() {
  if (!ui.sel) return null;
  if (ui.sel.a === "drum") return `물통 ${ui.sel.i + 1}`;
  const it = game.item(game.itemAt(ui.sel));
  if (!it) return null;
  return it.t === "f" ? "플라스크" : `${COLORS[it.c].name} - ${DAYS[it.d]}`;
}

/** 마우스 그림 (왼쪽/오른쪽 버튼 강조) */
function mouseIcon(side) {
  const el = h("span", { class: "mouse-icon", title: side === "L" ? "왼쪽 클릭" : "오른쪽 클릭" });
  el.innerHTML = `<svg viewBox="0 0 16 22" width="16" height="22" aria-hidden="true">
    <rect x="1" y="1" width="14" height="20" rx="7" fill="none" stroke="currentColor" stroke-width="1.5"/>
    <path d="${side === "L" ? "M8 1.5 A6.5 6.5 0 0 0 1.5 8 L1.5 9 L8 9 Z" : "M8 1.5 A6.5 6.5 0 0 1 14.5 8 L14.5 9 L8 9 Z"}" fill="var(--accent)"/>
    <line x1="8" y1="1.5" x2="8" y2="9" stroke="currentColor" stroke-width="1.2"/>
    <line x1="1.5" y1="9" x2="14.5" y2="9" stroke="currentColor" stroke-width="1.2"/></svg>`;
  return el;
}
const keycap = (k) => h("kbd", { class: "keycap", text: k });

let infoBuilt = false;
function renderInfo() {
  if (!infoBuilt) {
    // 단축키 안내: 아이콘 + 설명, 2줄 × 4칸으로 줄 맞춤
    const item = (icons, text) => h("div", { class: "key-item" }, h("span", { class: "key-icons" }, ...icons), h("span", { text }));
    $("#info").replaceChildren(h("div", { class: "key-guide" },
      item([mouseIcon("L")], "줍기/넣기"),
      item([mouseIcon("R")], "붓기"),
      item([keycap("R")], "버리기"),
      item([keycap("Q"), keycap("E")], "인벤토리 이전/다음"),
      item([keycap("A"), keycap("D")], "이전/다음 방"),
      item([keycap("M")], "지도"),
      item([keycap("K")], "스킬 창"),
      item([keycap("Esc")], "선택 취소")));
    infoBuilt = true;
  }
  const sel = describeSel();
  $("#selLabel").replaceChildren(sel ? h("b", { text: sel }) : h("span", { class: "muted", text: "선택 없음" }));
}

// ---------- 조작 ----------
function locHas(loc) {
  if (loc.a === "drum") return game.s.drums[loc.i].u.length > 0;
  return game.itemAt(loc) != null;
}

function pourFailReason(src, dst) {
  const D = game.container(dst);
  if (!game.container(src)?.u.length) return "빈 병이에요.";
  if (D && D.u.length >= D.cap) return "가득 차 있어요.";
  if (D?.drum) return "물통에는 같은 색만 부을 수 있어요.";
  return "부을 수 없어요.";
}

function moveFailReason(src, dst) {
  const it = game.item(game.itemAt(src));
  if (src.a === "shelf" && game.s.lockedRows[src.c][src.r]) return "완성된 행의 약병은 뺄 수 없어요.";
  if (dst.a === "flask") return "1구역에는 플라스크만 놓을 수 있어요.";
  if (dst.a === "rack") return "거치대에는 약병만 꽂을 수 있어요.";
  if (dst.a === "shelf") {
    if (it?.t === "f") return "플라스크는 선반에 올릴 수 없어요.";
    if (game.s.lockedRows[dst.c][dst.r]) return "완성된 행이에요.";
    return "한 가지 색으로 4칸이 가득 찬 약병만 올릴 수 있어요.";
  }
  return "옮길 수 없어요.";
}

async function doPour(src, dst, n, keepSel = src) {
  const factor = src.a === "inv" && dst.a === "inv" ? INVENTORY_POUR_FACTOR : 1;
  ui.pourMs = (POUR_BASE_MS + POUR_PER_UNIT_MS * n) * factor;
  ui.busy = true;
  ui.pouring = new Set([locKey(src), locKey(dst)]);
  ui.sel = keepSel; // 부은 뒤에도 선택 유지
  refresh();
  await delay(ui.pourMs);
  ui.pouring.clear();
  ui.busy = false;
  game.pour(src, dst); // → refresh
}

function onLoc(loc) {
  if (ui.busy) return;
  const sel = ui.sel;
  // 작업실: 클릭 = 인벤토리 ↔ 1·2구역 이동 (선택은 우클릭)
  if (game.s.room === "workshop" && ["inv", "flask", "rack", "inj"].includes(loc.a) && locHas(loc)) {
    quickMove(loc);
    return;
  }
  // 선반: 선반의 약병을 클릭하면 인벤토리로
  if (loc.a === "shelf" && locHas(loc)) {
    quickMove(loc);
    return;
  }
  if (!sel) {
    if (locHas(loc)) { ui.sel = loc; refresh(); }
    return;
  }
  if (sameLoc(sel, loc)) { ui.sel = null; refresh(); return; }

  if (loc.a === "drum" && !locHas(loc)) { toast("물통에 부으려면 우클릭하세요."); return; }
  if (!locHas(loc)) {
    if (sel.a === "drum") { toast("물통은 옮길 수 없어요. 빈 병을 골라 물통에서 따라 주세요."); return; }
    if (!game.move(sel, loc)) { toast(moveFailReason(sel, loc)); return; }
    if (sel.a !== "inv" && loc.a !== "inv") ui.sel = null; // 인벤토리에서 꺼냈으면 같은 자리(=당겨진 다음 물약), 인벤토리로 넣었으면 그 병이 선택된 채로
    refresh();
    return;
  }
  ui.sel = loc;
  refresh();
}

/** 우클릭: 선택한 병(또는 물통)의 내용물을 대상에 붓기 */
function pourInto(loc) {
  if (ui.busy) return;
  const sel = ui.sel;
  if (!sel) {
    // 선택한 게 없으면 우클릭한 병을 선택
    if (locHas(loc)) { ui.sel = loc; refresh(); }
    return;
  }
  if (sameLoc(sel, loc)) { ui.sel = null; refresh(); return; }
  if (sel.a === "shelf" || loc.a === "shelf") { toast("선반의 약병에는 붓거나 따를 수 없어요."); return; }
  if (loc.a !== "drum" && game.itemAt(loc) == null) { toast("빈자리에는 부을 수 없어요. 병이나 물통을 우클릭하세요."); return; }
  const n = game.pourAmount(sel, loc);
  if (n) doPour(sel, loc, n);
  else toast(pourFailReason(sel, loc));
}

/** R: 선택한 인벤토리 물건 버리기 (조제실: 바닥, 작업실: 거치대/플라스크 자리) */
function discardSelected() {
  if (ui.busy) return;
  if (ui.sel?.a !== "inv" || game.itemAt(ui.sel) == null) { toast("인벤토리에서 버릴 병을 먼저 선택하세요 (Q/E)."); return; }
  const room = game.s.room;
  if (!room.startsWith("brewery") && room !== "workshop") { toast("버리기는 조제실과 작업실에서만 할 수 있어요."); return; }
  const i = ui.sel.i;
  const id = game.itemAt(ui.sel);
  quickMove(ui.sel);
  if (game.s.inv.includes(id)) return; // 못 버림
  // 뒤 물약이 앞으로 당겨졌으니 같은 자리 = 다음 물약 (마지막이었으면 처음으로)
  const count = game.s.inv.filter((x) => x != null).length;
  ui.sel = count ? { a: "inv", i: i < count ? i : 0 } : null;
  refresh();
}

function quickMove(loc) {
  if (ui.busy) return;
  const id = game.itemAt(loc);
  if (id == null) return;
  const it = game.item(id);
  let dst = null;
  if (loc.a === "inv") {
    if (game.s.room === "workshop") dst = game.firstFree(it.t === "f" ? "flask" : "rack", id);
    else if (game.s.room.startsWith("brewery") && it.t === "f") { toast("플라스크는 바닥에 버릴 수 없어요."); return; }
    else if (game.s.room.startsWith("brewery")) {
      ui.sel = null;
      game.dropToPile(loc, +game.s.room.slice(7)); // 더미 위쪽 아무 데나
      return;
    }
  } else {
    dst = game.firstFree("inv", id);
  }
  if (!dst) { toast(loc.a !== "inv" ? "인벤토리가 가득 찼어요." : it.t === "f" ? "1구역에 빈 플라스크 자리가 없어요." : "거치대에 빈자리가 없어요."); return; }
  // 선택돼 있던 병을 옮기면 선택도 따라감
  const prevSel = ui.sel;
  if (prevSel && sameLoc(prevSel, loc)) ui.sel = dst;
  if (!game.move(loc, dst)) { ui.sel = prevSel; toast(moveFailReason(loc, dst)); }
}

// 칸 클릭 (작업실, 선반, 인벤토리)
document.addEventListener("click", (e) => {
  const valve = e.target.closest("[data-valve]");
  if (valve) { openValve(+valve.dataset.valve); return; }
  const el = e.target.closest("[data-loc]");
  if (el) { onLoc(parseLoc(el.dataset.loc)); return; }
  // 빈 곳 클릭 → 선택 해제 (조제실 바닥은 내려놓기에 쓰므로 제외)
  if (ui.sel && e.target.closest("#view") && !e.target.closest(".floor-world")) { ui.sel = null; refresh(); }
});
document.addEventListener("contextmenu", (e) => {
  if (!e.target.closest("#view, .inventory")) return;
  e.preventDefault(); // 게임 화면에서는 브라우저 메뉴 대신 붓기
  const drumOut = e.target.closest("[data-drum-out]");
  const drumIn = e.target.closest("[data-drum-in]");
  if (drumOut) { drumPour(+drumOut.dataset.drumOut, "out"); return; }
  if (drumIn) { drumPour(+drumIn.dataset.drumIn, "in"); return; }
  const el = e.target.closest("[data-loc]");
  if (el) pourInto(parseLoc(el.dataset.loc));
});

/** 물통: 위쪽 우클릭 = 선택한 병 → 물통, 아래쪽(수도꼭지) 우클릭 = 물통 → 선택한 병 */
function drumPour(i, dir) {
  if (ui.busy) return;
  const drum = { a: "drum", i };
  const sel = ui.sel;
  if (!sel || sel.a === "drum" || sel.a === "shelf" || game.itemAt(sel) == null) {
    toast("먼저 병을 우클릭으로 선택하세요.");
    return;
  }
  if (dir === "in") {
    const n = game.pourAmount(sel, drum);
    if (n) doPour(sel, drum, n);
    else toast(pourFailReason(sel, drum));
  } else {
    const n = game.pourAmount(drum, sel);
    if (n) doPour(drum, sel, n, sel);
    else toast(!game.s.drums[i].u.length ? "물통이 비어 있어요." : "병이 가득 차 있어요.");
  }
}

// ---------- 지도 ----------
// 저택 평면도 (그리드 위치: 열, 행)
const MAP_ROOMS = [
  { id: "brewery1", cls: "brewroom", area: "b2" },
  { id: "brewery2", cls: "brewroom", area: "b3" },
  { id: "brewery3", cls: "brewroom", area: "b4" },
  { id: "shelves", area: "sh" },
  { id: "brewery0", cls: "brewroom", area: "b1" },
  { id: "workshop", area: "ws" },
  { id: "brewery4", cls: "brewroom", area: "b5" },
];

function isRoomLocked(id) { return !!game.s.mapLocks?.[id]; }

function toggleRoomLock(id) {
  game.s.mapLocks = game.s.mapLocks || {};
  if (game.s.mapLocks[id]) delete game.s.mapLocks[id];
  else game.s.mapLocks[id] = true;
  scheduleSave();
  renderMap();
}

function renderMap() {
  const rooms = MAP_ROOMS.map(({ id, cls = "", area }) => {
    const locked = isRoomLocked(id);
    const sub = id.startsWith("brewery") ? `약병 ${game.pileCount(+id.slice(7))}개`
      : id === "shelves" ? `완성 ${game.completedRows()}행` : "색 맞추기";
    const go = h("button", { class: "btn small map-go", text: game.s.room === id ? "여기" : "이동" });
    go.disabled = game.s.room === id;
    go.addEventListener("click", (e) => { e.stopPropagation(); goRoom(id); closeOverlay("#mapOverlay"); });
    const el = h("div", {
      class: `map-room ${cls}` + (game.s.room === id ? " here" : "") + (locked ? " is-locked" : ""),
      style: `grid-area:${area}`,
      title: "클릭: 잠금/잠금 해제 (잠그면 A/D 이동 때 건너뜀)",
    },
      h("span", { class: "map-lock", text: locked ? "🔒" : "🔓" }),
      h("b", { text: ROOM_NAMES[id] }), h("small", { text: sub }), go);
    el.addEventListener("click", () => toggleRoomLock(id));
    return el;
  });
  $("#mapGrid").replaceChildren(...rooms);
}

function goRoom(id) {
  if (ui.busy) return;
  if (ui.sel && ui.sel.a !== "inv") ui.sel = null;
  if (id === "shelves" && game.s.room !== "shelves") ui.shelf = null;
  game.setRoom(id);
}

// ---------- 스킬 ----------
function renderSkills() {
  $("#skillPoints").textContent = game.skillPoints;
  const list = SKILLS.map((s) => {
    const lv = game.s.skills[s.id];
    const unlocked = game.skillUnlocked(s.id);
    const cost = game.upgradeCost(s.id);
    const val = (l) => `${s.values[l - 1]}${s.unit}` + (s.extra ? ` · ${s.extra.name} ${s.extra.values[l - 1]}${s.extra.unit}` : "")
      + (s.cooldown ? ` · 대기 ${s.cooldown[l - 1]}초` : "");
    const btn = h("button", { class: "btn primary small" });
    if (!unlocked) { btn.textContent = `Lv ${s.unlock}에 해금`; btn.disabled = true; }
    else if (cost == null) { btn.textContent = "최대"; btn.disabled = true; }
    else {
      btn.textContent = lv === 0 ? `배우기 (${cost}P)` : `강화 (${cost}P)`;
      btn.disabled = !game.canUpgrade(s.id);
      btn.addEventListener("click", () => { game.upgrade(s.id); renderSkills(); });
    }
    const pips = h("div", { class: "pips" }, Array.from({ length: SKILL_MAX }, (_, k) => h("i", { class: k < lv && unlocked ? "on" : "" })));
    return h("div", { class: "skill" + (unlocked ? "" : " locked") },
      h("div", { class: "skill-main" },
        h("div", { class: "skill-name" }, h("b", { text: s.name }), s.active ? h("span", { class: "tag", text: "사용" }) : null),
        h("div", { class: "skill-desc muted", text: s.desc }),
        h("div", { class: "skill-val" }, lv === 0 ? "아직 배우지 않음" : `현재 ${val(lv)}`, cost != null ? ` → 다음 ${val(lv + 1)}` : "")),
      pips, btn);
  });
  $("#skillList").replaceChildren(...list);
}

// ---------- 분류기 ----------
function armSorter() { ui.sorterDue = performance.now() + SORTER_IDLE_MS; }

function openValve(i) {
  if (ui.busy) return;
  const it = game.item(game.itemAt({ a: "inj", i }));
  if (!it?.u.length) return;
  if (game.s.sorter.store.length >= game.sorterCap) { toast("분류기 저장 공간이 가득 찼어요."); armSorter(); return; }
  game.sorterInject(i);
  armSorter();
}

function sorterTick(now) {
  const bar = $("#view .sorter-timer > i");
  if (bar) bar.style.width = ui.sorterDue ? `${Math.max(0, (ui.sorterDue - now) / SORTER_IDLE_MS) * 100}%` : "0%";
  if (ui.sorterDue && now >= ui.sorterDue && !ui.busy) {
    ui.sorterDue = 0;
    const n = game.sorterDispense();
    if (n && game.s.room === "workshop") toast(`분류기가 병에 ${n}칸을 채웠어요.`);
  }
}

// ---------- 사용 스킬 (1: 부름, 2: 자동 진열) ----------
const skillRt = { cdUntil: { summon: 0, autoShelve: 0 }, autoUntil: 0, lastTick: 0 };
const ACTIVE_KEYS = { summon: "1", autoShelve: "2" };

function useSkill(id) {
  const now = performance.now();
  const s = game.skillDef(id);
  const lv = game.s.skills[id];
  if (!game.skillUnlocked(id)) { toast(`${s.name}: 레벨 ${s.unlock}에 해금돼요.`); return; }
  if (lv === 0) { toast(`${s.name}: 스킬 창(K)에서 포인트를 찍어야 쓸 수 있어요.`); return; }
  if (id === "autoShelve" && now < skillRt.autoUntil) { toast("자동 진열이 이미 켜져 있어요."); return; }
  if (now < skillRt.cdUntil[id]) { toast(`${s.name}: ${((skillRt.cdUntil[id] - now) / 1000).toFixed(1)}초 뒤에 쓸 수 있어요.`); return; }

  if (id === "summon") {
    if (!game.s.room.startsWith("brewery")) { toast("부름은 조제실에서만 쓸 수 있어요."); return; }
    const it = ui.sel?.a === "inv" ? game.item(game.itemAt(ui.sel)) : null;
    if (!it || it.t !== "b") { toast("인벤토리에서 기준이 될 약병을 먼저 선택하세요 (Q/E)."); return; }
    const free = game.s.inv.slice(0, game.invSize).filter((x) => x == null).length;
    if (!free) { toast("인벤토리가 가득 찼어요."); return; }
    const got = game.summon(+game.s.room.slice(7), it.c, s.values[lv - 1]);
    if (!got) { toast(`이 방 바닥에 ${COLORS[it.c].name} 라벨 약병이 없어요.`); return; }
    toast(`부름! ${COLORS[it.c].name} 라벨 약병 ${got}개를 불러왔어요.`);
    skillRt.cdUntil.summon = now + s.cooldown[lv - 1] * 1000;
  } else {
    skillRt.autoUntil = now + s.values[lv - 1] * 1000;
    skillRt.cdUntil.autoShelve = skillRt.autoUntil + s.cooldown[lv - 1] * 1000; // 대기시간은 효과가 끝난 뒤부터
    toast(`자동 진열 ${s.values[lv - 1]}초! 선반을 크게 열어 두면 맞는 약병이 알아서 올라가요.`);
  }
  renderSkillBar();
}

function renderSkillBar() {
  const now = performance.now();
  const bar = $("#skillBar");
  if (!bar.childElementCount) {
    for (const id of Object.keys(ACTIVE_KEYS)) {
      const b = h("button", { class: "btn skill-btn", "data-skill": id });
      b.addEventListener("click", () => useSkill(id));
      bar.append(b);
    }
  }
  for (const b of bar.children) {
    const id = b.dataset.skill;
    const s = game.skillDef(id);
    const lv = game.s.skills[id];
    const active = id === "autoShelve" && now < skillRt.autoUntil;
    const cd = Math.max(0, skillRt.cdUntil[id] - now);
    let state, frac = 0;
    if (lv === 0) {
      state = "K에서 배울 수 있어요";
    } else if (active) {
      const total = s.values[lv - 1] * 1000;
      state = `켜짐 ${((skillRt.autoUntil - now) / 1000).toFixed(1)}초`;
      frac = (skillRt.autoUntil - now) / total;
    } else if (cd > 0) {
      state = `대기 ${(cd / 1000).toFixed(1)}초`;
      frac = cd / (s.cooldown[lv - 1] * 1000);
    } else {
      state = id === "summon" ? `${s.values[lv - 1]}병 불러오기` : `${s.values[lv - 1]}초 동안`;
    }
    b.classList.toggle("active", active);
    b.classList.toggle("cooling", lv === 0 || (!active && cd > 0));
    b.replaceChildren(
      h("kbd", { text: ACTIVE_KEYS[id] }), h("b", { text: lv ? s.name : "???" }), lv ? ` Lv${lv}` : "",
      h("small", { text: state }),
      h("i", { class: "cd", style: `width:${Math.min(1, frac) * 100}%` }));
  }
}

// 0.1초마다: 스킬 표시 갱신 + 자동 진열 동작
setInterval(() => {
  const now = performance.now();
  renderSkillBar();
  sorterTick(now);
  if (now < skillRt.autoUntil && !ui.busy && game.s.room === "shelves" && ui.shelf != null && now - skillRt.lastTick > 300) {
    skillRt.lastTick = now;
    const dst = game.autoShelveOne(ui.shelf);
    if (dst && ui.sel?.a === "inv" && game.itemAt(ui.sel) == null) { ui.sel = null; refresh(); }
  }
}, 100);

// ---------- 오버레이 ----------
function openOverlay(sel) {
  if (sel === "#mapOverlay") renderMap();
  if (sel === "#skillOverlay") renderSkills();
  $(sel).classList.add("show");
}
function closeOverlay(sel) { $(sel).classList.remove("show"); }
function toggleOverlay(sel) {
  if ($(sel).classList.contains("show")) closeOverlay(sel);
  else { document.querySelectorAll(".overlay.show").forEach((o) => o.classList.remove("show")); openOverlay(sel); }
}

$("#btnMap").addEventListener("click", () => toggleOverlay("#mapOverlay"));
$("#btnSkills").addEventListener("click", () => toggleOverlay("#skillOverlay"));
$("#btnMenu").addEventListener("click", () => toggleOverlay("#menuOverlay"));
document.querySelectorAll(".overlay").forEach((o) => {
  o.addEventListener("click", (e) => { if (e.target === o || e.target.closest("[data-close]")) o.classList.remove("show"); });
});
$("#btnNewGame").addEventListener("click", () => {
  if (!confirm("지금까지의 진행 상황이 모두 사라져요. 새로 시작할까요?")) return;
  Game.clearSave();
  game = new Game(newGameState());
  bindGame();
  ui.sel = null; ui.shelf = null; mountedRoom = null;
  closeOverlay("#menuOverlay");
  refresh();
  showIntro();
});
$("#btnIntroOk").addEventListener("click", () => closeOverlay("#introOverlay"));

document.addEventListener("keydown", (e) => {
  if (e.target.closest("input, textarea") || e.ctrlKey || e.metaKey || e.altKey) return;
  if (e.key === "Escape") {
    const open = document.querySelector(".overlay.show");
    if (open) open.classList.remove("show");
    else if (ui.sel) { ui.sel = null; refresh(); }
    return;
  }
  if (e.repeat && (e.code === "KeyM" || e.code === "KeyK" || e.code.startsWith("Digit"))) return;
  switch (e.code) {
    case "KeyM": toggleOverlay("#mapOverlay"); break;
    case "KeyK": toggleOverlay("#skillOverlay"); break;
    case "KeyQ": cycleInventory(-1); break;
    case "KeyE": cycleInventory(1); break;
    case "KeyR": discardSelected(); break;
    case "KeyA": stepRoom(-1); break;
    case "KeyD": stepRoom(1); break;
    case "Digit1": case "Numpad1": useSkill("summon"); break;
    case "Digit2": case "Numpad2": useSkill("autoShelve"); break;
    default: return;
  }
  e.preventDefault();
});

/** Q/E: 인벤토리에서 물건이 있는 칸 사이 이전/다음 선택 */
function cycleInventory(dir) {
  if (ui.busy) return;
  const filled = [];
  for (let i = 0; i < game.invSize; i++) if (game.s.inv[i] != null) filled.push(i);
  if (!filled.length) return;
  let next;
  if (ui.sel?.a === "inv") {
    const cur = ui.sel.i;
    if (dir > 0) next = filled.find((i) => i > cur) ?? filled[0];
    else next = [...filled].reverse().find((i) => i < cur) ?? filled[filled.length - 1];
  } else {
    next = dir > 0 ? filled[0] : filled[filled.length - 1]; // E: 처음, Q: 마지막
  }
  ui.sel = { a: "inv", i: next };
  refresh();
}

/** A/D: 조제실 1~5 → 작업실 → 선반 → 조제실 1 순환 (잠근 방은 건너뜀) */
const ROOM_ORDER = [...Array.from({ length: BREWERY_COUNT }, (_, i) => `brewery${i}`), "workshop", "shelves"];
function stepRoom(dir) {
  if (ui.busy) return;
  const n = ROOM_ORDER.length;
  let i = ROOM_ORDER.indexOf(game.s.room);
  for (let k = 0; k < n - 1; k++) {
    i = (i + dir + n) % n;
    if (!isRoomLocked(ROOM_ORDER[i])) break;
  }
  if (ROOM_ORDER[i] === game.s.room || isRoomLocked(ROOM_ORDER[i])) { toast("이동할 수 있는 방이 없어요. 지도(M)에서 잠금을 풀어 주세요."); return; }
  goRoom(ROOM_ORDER[i]);
  if ($("#mapOverlay").classList.contains("show")) renderMap();
}

window.addEventListener("resize", () => breweryView.resize());

// ---------- 저장 / 알림 ----------
let saveTimer = 0;
function scheduleSave() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => game.save(), 400);
}
window.addEventListener("beforeunload", () => game.save());

function bindGame() {
  game.onChange((info) => {
    if (info.type === "move" && info.dst.a === "inj") armSorter(); // 병을 꽂으면 2초 뒤 살펴봄
    // 인벤토리가 앞으로 당겨졌으면 선택한 칸 번호도 맞춤
    if (info.invMap && ui.sel?.a === "inv") {
      const count = game.s.inv.filter((x) => x != null).length;
      const i = ui.sel.i;
      const ni = info.invMap[i] ?? (i < count ? i : count ? 0 : null); // 빠진 칸이면 그 자리(=다음 물약)
      ui.sel = ni == null ? null : { a: "inv", i: ni };
    }
    // 인벤토리로 병이 들어오면 그 병을 선택 (부름은 마지막으로 들어온 병)
    if (info.dst?.a === "inv" && (info.type === "move" || info.type === "pileTake" || info.type === "summon")) {
      ui.sel = { ...info.dst };
    }
    if (info.type === "move" && info.row) {
      const { c, r, xp, levelUp } = info.row;
      const lv = game.level;
      let msg = `${COLORS[c].name} 선반 ${r + 1}행 완성! +${xp} XP`;
      if (levelUp > 0) {
        msg += ` · 레벨 업! Lv ${lv} (스킬 포인트 +${levelUp})`;
        if (lv - levelUp < ZONE3_LEVEL && lv >= ZONE3_LEVEL) msg += " · 작업실 3구역이 열렸어요!";
        if (lv - levelUp < ZONE4_LEVEL && lv >= ZONE4_LEVEL) msg += " · 작업실 4구역이 열렸어요!";
      }
      toast(msg);
    }
    scheduleSave();
    refresh();
  });
}

function showIntro() { openOverlay("#introOverlay"); }

bindGame();
refresh();
if (game.skillsReset) toast("레벨이 낮아져서 스킬을 처음 상태로 되돌리고 포인트를 돌려드렸어요.");
try {
  if (!localStorage.getItem("witch-potion-intro")) {
    showIntro();
    localStorage.setItem("witch-potion-intro", "1");
  }
} catch { showIntro(); }

// 디버그/테스트용
window.__game = () => game;
