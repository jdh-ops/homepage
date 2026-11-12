import {
  COLORS, DAYS, SKILLS, SKILL_MAX, MAX_LEVEL, xpForLevel, ZONE3_LEVEL, ZONE4_LEVEL,
  SAVE_KEY, SHELF_ROWS, FLOOR_W, FLOOR_H, FLOOR_W_MOBILE, FLOOR_H_MOBILE, POUR_MS, BREWERY_COUNT, SORTER_IDLE_MS,
} from "./config.js";
import { Game, newGameState, sameLoc } from "./game.js";
import { encodeSave, decodeSave } from "./save-format.js";
import * as cloud from "./cloud.js";
import { $, h, vial, locKey, parseLoc, toast, delay } from "./ui/common.js";
import { createBreweryView } from "./ui/brewery.js";
import { renderWorkshop } from "./ui/workshop.js";
import { renderShelves } from "./ui/shelves.js";

// 로그인 전에는 임시 게임(저장 안 함). 로그인하면 그 계정의 세이브로 바꿈
let game = new Game(newGameState());
let account = null; // { id, nickname, createdAt }

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
  ...Object.fromEntries(Array.from({ length: BREWERY_COUNT }, (_, i) => [`brewery${i}`, `창고 ${i + 1}`])),
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
  floorSize() { return mobile ? { w: FLOOR_W_MOBILE, h: FLOOR_H_MOBILE } : { w: FLOOR_W, h: FLOOR_H }; },
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
    const sc = $("#view .zoom-scroll");
    if (!sc || c == null) return;
    // 첫 번째 미완성 행이 맨 위(요일 머리글 바로 아래)에 오도록
    const r = game.s.lockedRows[c].findIndex((done) => !done);
    const cell = r > 0 ? sc.querySelector(`[data-loc="shelf:${c}:${r}:0"]`) : null;
    sc.scrollTop = 0;
    if (cell) {
      const head = sc.querySelector(".st-head")?.offsetHeight || 0;
      sc.scrollTop = cell.getBoundingClientRect().top - sc.getBoundingClientRect().top - head - 6;
    }
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
  for (const id of ["#skillBadge", "#menuBadge", "#menuSkillBadge"]) {
    const badge = $(id);
    badge.textContent = pts;
    badge.hidden = pts <= 0;
  }
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
const roomScroll = {}; // 방 → 마지막 스크롤 위치 (이번 접속 동안만)
function renderRoom() {
  const view = $("#view");
  // 모바일은 #view 가 스크롤됨. 방마다 마지막 스크롤 위치를 기억했다가 돌아오면 그 자리로
  if (mountedRoom && mountedRoom !== game.s.room) roomScroll[mountedRoom] = view.scrollTop;
  const viewScroll = mountedRoom === game.s.room ? view.scrollTop : (roomScroll[game.s.room] ?? 0);
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
  view.scrollTop = viewScroll;
}

// ---------- PC / 모바일 화면 ----------
const MOBILE_KEY = "witch-potion-mobile";
function savedMobilePref() {
  try { const v = localStorage.getItem(MOBILE_KEY); if (v != null) return v === "1"; } catch { /* 무시 */ }
  return matchMedia("(max-width: 760px), (pointer: coarse)").matches; // 처음엔 기기에 맞춰
}
let mobile = savedMobilePref();

function applyMode(m, initial = false) {
  const changed = !initial && m !== document.body.classList.contains("mobile");
  mobile = m;
  try { localStorage.setItem(MOBILE_KEY, m ? "1" : "0"); } catch { /* 무시 */ }
  document.body.classList.toggle("mobile", m);
  // 스킬 버튼: 모바일은 아래 바(< 1 2 >), PC는 인벤토리 옆
  (m ? $("#mobileSkills") : $(".side")).append($("#skillBar"));
  $("#btnToggleMobile").textContent = m ? "🖥 PC 화면으로" : "📱 모바일 화면으로";
  if (changed) {
    // 바닥 크기가 바뀌므로 창고 병을 다시 쌓음
    for (const list of game.s.floor) for (const e of list) { e.x = null; e.y = null; delete e.drop; }
    mountedRoom = null;
    refresh();
  }
}
applyMode(mobile, true);

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
  ui.pourMs = POUR_MS;
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

/** R: 선택한 인벤토리 물건 버리기 (창고: 바닥, 작업실: 거치대/플라스크 자리) */
function discardSelected() {
  if (ui.busy) return;
  if (ui.sel?.a !== "inv" || game.itemAt(ui.sel) == null) { toast("인벤토리에서 버릴 병을 먼저 선택하세요 (Q/E)."); return; }
  const room = game.s.room;
  if (!room.startsWith("brewery") && room !== "workshop") { toast("버리기는 창고와 작업실에서만 할 수 있어요."); return; }
  const i = ui.sel.i;
  const id = game.itemAt(ui.sel);
  quickMove(ui.sel);
  if (game.s.inv.includes(id)) return; // 못 버림
  // 뒤 물약이 앞으로 당겨졌으니 같은 자리 = 다음 물약 (마지막이었으면 바로 앞 물약)
  const count = game.s.inv.filter((x) => x != null).length;
  ui.sel = count ? { a: "inv", i: i < count ? i : count - 1 } : null;
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

// ---------- 드래그: 병(또는 물통)을 끌어서 다른 병·물통에 놓으면 붓기, 빈 칸에 놓으면 옮기기 ----------
// 마우스: 왼쪽 버튼으로 끌기. 휴대폰: 0.25초 길게 누른 뒤 끌기 (그냥 밀면 화면 스크롤)
let lastPointerType = "mouse";
const TOUCH_HOLD_MS = 120; // 작업실·선반에서 손가락으로 끌기 전에 누르고 있을 시간
let drag = null;
let suppressClick = false;

/** 끌기를 시작할 수 있는 것: 내용물이 있는 병(선반 제외) 또는 물통, 그리고 빈 칸으로 옮길 수 있는 병 */
function dragSourceAt(target) {
  const d = target.closest("[data-drum-in], [data-drum-out]");
  if (d) {
    const i = +(d.dataset.drumIn ?? d.dataset.drumOut);
    return game.s.drums[i].u.length ? { a: "drum", i } : null;
  }
  const el = target.closest("[data-loc]");
  if (!el) return null;
  const loc = parseLoc(el.dataset.loc);
  return game.itemAt(loc) != null ? loc : null;
}

/** 놓는 곳: 물통이면 물통, 아니면 칸 */
function dropTargetAt(x, y) {
  const t = document.elementFromPoint(x, y);
  if (!t) return null;
  // 수도꼭지: 끌고 온 병으로 빼기 / 물통 몸통: 넣기
  const tap = t.closest("[data-drum-out]");
  if (tap) return { loc: { a: "drum", i: +tap.dataset.drumOut }, el: tap, out: true };
  const d = t.closest("[data-drum-in]");
  if (d) return { loc: { a: "drum", i: +d.dataset.drumIn }, el: d.querySelector(".drum-body") || d };
  const el = t.closest("[data-loc]");
  return el ? { loc: parseLoc(el.dataset.loc), el } : null;
}

function startDrag() {
  drag.active = true;
  const it = drag.src.a === "drum" ? null : game.item(game.itemAt(drag.src));
  drag.ghost = h("div", { class: "drag-ghost" });
  if (it) drag.ghost.append(vial(it));
  else drag.ghost.append(h("i", { class: "drag-drop", "--c": COLORS[game.s.drums[drag.src.i].u.at(-1)].hex }));
  document.body.append(drag.ghost);
  moveGhost(drag.x, drag.y);
  document.body.classList.add("dragging");
}

function moveGhost(x, y) {
  drag.ghost.style.transform = `translate(${x - 20}px, ${y - 40}px)`;
  const hit = dropTargetAt(x, y);
  if (drag.hoverEl && drag.hoverEl !== hit?.el) drag.hoverEl.classList.remove("drop-target");
  drag.hoverEl = hit && !sameLoc(hit.loc, drag.src) ? hit.el : null;
  drag.hoverEl?.classList.add("drop-target");
}

function endDrag(x, y) {
  const d = drag;
  drag = null;
  clearTimeout(d.timer);
  if (!d.active) return;
  d.ghost.remove();
  d.hoverEl?.classList.remove("drop-target");
  document.body.classList.remove("dragging");
  suppressClick = true;
  setTimeout(() => { suppressClick = false; }, 0);
  const hit = dropTargetAt(x, y);
  if (!hit || sameLoc(hit.loc, d.src) || ui.busy) return;
  const { src } = d, dst = hit.loc;
  if (hit.out && src.a !== "drum") {
    // 병을 수도꼭지에 놓음 → 물통에서 그 병으로 따르기
    if (src.a === "shelf") { toast("선반의 약병에는 따를 수 없어요."); return; }
    const n = game.pourAmount(dst, src);
    if (n) doPour(dst, src, n, src);
    else toast(!game.s.drums[dst.i].u.length ? "물통이 비어 있어요." : "병이 가득 차 있어요.");
    return;
  }
  const dstIsContainer = dst.a === "drum" || (dst.a !== "shelf" && game.itemAt(dst) != null);
  if (dstIsContainer) {
    if (src.a === "shelf") { toast("선반의 약병에는 붓거나 따를 수 없어요."); return; }
    const n = game.pourAmount(src, dst);
    if (n) doPour(src, dst, n, src.a === "drum" ? dst : src);
    else toast(src.a === "drum" && !game.s.drums[src.i].u.length ? "물통이 비어 있어요." : pourFailReason(src, dst));
    return;
  }
  // 빈 칸: 옮기기
  if (src.a === "drum") { toast("물통은 옮길 수 없어요. 병에 끌어다 놓으면 따라요."); return; }
  if (!game.move(src, dst)) toast(moveFailReason(src, dst));
}

document.addEventListener("pointerdown", (e) => {
  lastPointerType = e.pointerType;
  if (!account || ui.busy || drag) return;
  if (e.pointerType === "mouse" && e.button !== 0) return;
  const src = dragSourceAt(e.target);
  if (!src) return;
  // 인벤토리는 스크롤할 일이 없으니 손가락도 바로 끌기. 나머지(작업실·선반)는 짧게 누른 뒤 끌기 (그냥 밀면 스크롤)
  const immediate = e.pointerType === "mouse" || !!e.target.closest(".inventory");
  drag = { src, x0: e.clientX, y0: e.clientY, x: e.clientX, y: e.clientY, id: e.pointerId, active: false, armed: immediate };
  if (!immediate) {
    drag.timer = setTimeout(() => { if (drag) { drag.armed = true; startDrag(); navigator.vibrate?.(15); } }, TOUCH_HOLD_MS);
  }
});
document.addEventListener("pointermove", (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  drag.x = e.clientX; drag.y = e.clientY;
  const dist = Math.hypot(e.clientX - drag.x0, e.clientY - drag.y0);
  if (!drag.armed) { if (dist > 12) { clearTimeout(drag.timer); drag = null; } return; } // 휴대폰: 누르기 전에 밀면 스크롤
  if (!drag.active && dist > 6) startDrag();
  if (drag.active) moveGhost(e.clientX, e.clientY);
});
document.addEventListener("pointerup", (e) => { if (drag && e.pointerId === drag.id) endDrag(e.clientX, e.clientY); });
document.addEventListener("pointercancel", (e) => {
  if (!drag || e.pointerId !== drag.id) return;
  if (drag.active) endDrag(-1, -1); else { clearTimeout(drag.timer); drag = null; }
});
// 끄는 동안 화면이 스크롤되지 않게
document.addEventListener("touchmove", (e) => { if (drag?.active) e.preventDefault(); }, { passive: false });
// 아이폰: 빠르게 두 번 탭하면 화면이 확대됨 → 두 번째 탭의 기본 동작(확대)을 막고, 탭은 클릭으로 그대로 전달
let lastTouchEnd = 0;
document.addEventListener("touchend", (e) => {
  const now = Date.now();
  if (now - lastTouchEnd < 350 && e.changedTouches.length === 1 && !e.target.closest("input, textarea, select")) {
    e.preventDefault();
    e.target.click?.();
  }
  lastTouchEnd = now;
}, { passive: false });
document.addEventListener("dblclick", (e) => e.preventDefault());
// 끌고 난 뒤 따라오는 클릭은 무시
document.addEventListener("click", (e) => { if (suppressClick) { e.stopPropagation(); e.preventDefault(); suppressClick = false; } }, true);

// 칸 클릭 (작업실, 선반, 인벤토리)
document.addEventListener("click", (e) => {
  const valve = e.target.closest("[data-valve]");
  if (valve) { openValve(+valve.dataset.valve); return; }
  const el = e.target.closest("[data-loc]");
  if (el) { onLoc(parseLoc(el.dataset.loc)); return; }
  // 빈 곳 클릭 → 선택 해제 (창고 바닥은 내려놓기에 쓰므로 제외)
  if (ui.sel && e.target.closest("#view") && !e.target.closest(".floor-world")) { ui.sel = null; refresh(); }
});
document.addEventListener("contextmenu", (e) => {
  if (!e.target.closest("#view, .inventory")) return;
  e.preventDefault(); // 게임 화면에서는 브라우저 메뉴 대신 붓기
  if (lastPointerType === "touch") return; // 휴대폰 길게 누르기는 드래그로 처리
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
    const sub = id.startsWith("brewery") ? `남은 약병 ${game.pileCount(+id.slice(7))}개`
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
    if (!game.s.room.startsWith("brewery")) { toast("부름은 창고에서만 쓸 수 있어요."); return; }
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
      state = "스킬 창에서 배워요";
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
  if (sel === "#menuOverlay") renderAccount();
  if (sel === "#skillOverlay") renderSkills();
  $(sel).classList.add("show");
}
function closeOverlay(sel) { $(sel).classList.remove("show"); }
function toggleOverlay(sel) {
  if ($(sel).classList.contains("show")) closeOverlay(sel);
  else { document.querySelectorAll(".overlay.show").forEach((o) => o.classList.remove("show")); openOverlay(sel); }
}

$("#btnMap").addEventListener("click", () => toggleOverlay("#mapOverlay"));
$("#btnMenuMap").addEventListener("click", () => toggleOverlay("#mapOverlay"));
$("#btnMenuSkills").addEventListener("click", () => toggleOverlay("#skillOverlay"));
$("#btnToggleMobile").addEventListener("click", () => { applyMode(!mobile); closeOverlay("#menuOverlay"); });
$("#btnPrev").addEventListener("click", () => stepRoomOrShelf(-1));
$("#btnNext").addEventListener("click", () => stepRoomOrShelf(1));
$("#btnSkills").addEventListener("click", () => toggleOverlay("#skillOverlay"));
$("#btnMenu").addEventListener("click", () => toggleOverlay("#menuOverlay"));
document.querySelectorAll(".overlay").forEach((o) => {
  if (o.id === "loginOverlay") return; // 로그인 화면은 닫을 수 없음
  o.addEventListener("click", (e) => { if (e.target === o || e.target.closest("[data-close]")) o.classList.remove("show"); });
});
$("#btnNewGame").addEventListener("click", () => {
  if (!confirm("지금까지의 진행 상황이 모두 사라져요. 새로 시작할까요?")) return;
  startGame(new Game(newGameState()));
  saveNow(true);
  closeOverlay("#menuOverlay");
  showIntro();
});
$("#btnIntroOk").addEventListener("click", () => closeOverlay("#introOverlay"));

document.addEventListener("keydown", (e) => {
  if (e.target.closest("input, textarea") || e.ctrlKey || e.metaKey || e.altKey) return;
  if (!account) return; // 로그인 화면
  if (e.key === "Escape") {
    const open = document.querySelector(".overlay.show:not(#loginOverlay)");
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
    case "KeyA": stepRoomOrShelf(-1); break;
    case "KeyD": stepRoomOrShelf(1); break;
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

/** A/D: 선반을 크게 보고 있으면 이전/다음 색 선반, 아니면 이전/다음 방 */
function stepRoomOrShelf(dir) {
  if (game.s.room === "shelves" && ui.shelf != null) {
    ctx.openShelf((ui.shelf + dir + COLORS.length) % COLORS.length);
    return;
  }
  stepRoom(dir);
}

/** A/D: 창고 1~5 → 작업실 → 선반 → 창고 1 순환 (잠근 방은 건너뜀) */
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

// ---------- 저장 ----------
// 이 기기에 바로 저장하고(0.4초 뒤), 서버에는 최대 20초에 한 번 + 창 닫기 때 저장 (압축해서 약 8KB).
const CLOUD_EVERY_MS = 20000;
const localKey = () => `witch-potion-save:${account.id}`;
let saveTimer = 0, cloudTimer = 0, lastCloud = 0, cloudDirty = false, lastSavedAt = 0, cloudError = false;

function readLocal() {
  try { const raw = localStorage.getItem(localKey()); return raw ? JSON.parse(raw) : null; } catch { return null; }
}

function writeLocal() {
  if (!account) return null;
  const rec = { data: encodeSave(game.s), updatedAt: Date.now() };
  try { localStorage.setItem(localKey(), JSON.stringify(rec)); } catch { /* 저장 공간 부족 등 */ }
  return rec;
}

async function flushCloud() {
  if (!account || !cloudDirty) return;
  clearTimeout(cloudTimer); cloudTimer = 0;
  const rec = writeLocal();
  cloudDirty = false;
  lastCloud = Date.now();
  try {
    await cloud.writeSave(account, rec.data, rec.updatedAt);
    lastSavedAt = rec.updatedAt; cloudError = false;
    account.lastSeen = new Date().toISOString(); // 서버가 마지막 접속 시각도 갱신함
  } catch (e) {
    cloudDirty = true; cloudError = true; // 다음에 다시 시도
    console.warn("서버 저장 실패", e);
    if (e.code === "invalid_session") { kicked(e.message); return; }
  }
  renderAccount();
}

function scheduleSave() {
  if (!account) return;
  cloudDirty = true;
  clearTimeout(saveTimer);
  saveTimer = setTimeout(writeLocal, 400);
  if (!cloudTimer) cloudTimer = setTimeout(flushCloud, Math.max(0, lastCloud + CLOUD_EVERY_MS - Date.now()));
}

function saveNow(force = false) {
  if (!account) return;
  if (force) cloudDirty = true;
  writeLocal();
  flushCloud();
}

function saveOnExit() {
  if (!account) return;
  const rec = writeLocal();
  if (cloudDirty && rec) { cloud.writeSaveOnExit(account, rec.data, rec.updatedAt); cloudDirty = false; }
}
window.addEventListener("pagehide", saveOnExit);
document.addEventListener("visibilitychange", () => { if (document.visibilityState === "hidden") saveOnExit(); });

// ---------- 계정 ----------
function startGame(g) {
  game = g;
  bindGame();
  ui.sel = null; ui.shelf = null; ui.sorterDue = 0; mountedRoom = null;
  refresh();
}

/** 로그인한 계정의 세이브 불러오기: 서버와 이 기기 중 최신 것. 둘 다 없으면 예전(계정 없던 시절) 세이브 → 새 게임 */
async function enterAccount(acc) {
  account = acc;
  let server = null, serverFailed = false;
  try { server = await cloud.loadSave(); } catch (e) { serverFailed = true; console.warn(e); }
  const local = readLocal();
  let rec = [server, local].filter(Boolean).sort((a, b) => b.updatedAt - a.updatedAt)[0] || null;
  let isNew = false;
  if (!rec) {
    let legacy = null;
    try { legacy = JSON.parse(localStorage.getItem(SAVE_KEY) || "null"); } catch { /* 무시 */ }
    if (legacy?.v === 1) {
      rec = { data: legacy, updatedAt: Date.now() };
      try { localStorage.removeItem(SAVE_KEY); } catch { /* 무시 */ }
    }
  }
  const state = rec ? decodeSave(rec.data) : null;
  if (!state) isNew = true;
  startGame(new Game(state || newGameState()));
  lastSavedAt = server?.updatedAt || 0;
  closeOverlay("#loginOverlay");
  saveNow(true); // 서버에 최신본 올려 두기 (새 계정이면 첫 세이브)
  if (serverFailed) toast("서버에서 불러오지 못해서 이 기기에 저장된 진행으로 시작했어요.");
  else if (game.skillsReset) toast("레벨이 낮아져서 스킬을 처음 상태로 되돌리고 포인트를 돌려드렸어요.");
  if (isNew) showIntro();
}

/** 다른 곳에서 로그인해서 이 기기의 로그인이 끊겼을 때: 이 기기 저장본은 버리고(서버 것이 최신) 로그인 화면으로 */
function kicked(msg) {
  if (!account) return;
  try { localStorage.removeItem(localKey()); } catch { /* 무시 */ }
  clearTimeout(cloudTimer); cloudTimer = 0; cloudDirty = false;
  showLogin();
  toast(msg);
}

// 1분마다 로그인이 살아 있는지 확인 (약 0.5KB)
setInterval(async () => {
  if (!account || document.visibilityState !== "visible") return;
  try {
    const acc = await cloud.getAccount();
    if (!acc) kicked("다른 곳에서 로그인해서 로그아웃됐어요.");
    else account.lastSeen = acc.lastSeen;
  } catch { /* 연결 문제는 무시 */ }
}, 60000);

function showLogin() {
  account = null;
  $("#loginMobile").checked = mobile;
  document.querySelectorAll(".overlay.show").forEach((o) => o.classList.remove("show"));
  $("#loginError").textContent = "";
  $("#loginPw").value = ""; $("#loginPw2").value = "";
  openOverlay("#loginOverlay");
  $("#loginNick").focus();
}

let loginMode = "login";
function setLoginMode(mode) {
  loginMode = mode;
  $("#loginForm").classList.toggle("signup", mode === "signup");
  document.querySelectorAll(".login-tabs .tab").forEach((t) => t.classList.toggle("active", t.dataset.mode === mode));
  $("#btnLoginSubmit").textContent = mode === "signup" ? "가입하고 시작" : "로그인";
  $("#loginPw").autocomplete = mode === "signup" ? "new-password" : "current-password";
  $("#loginError").textContent = "";
}
document.querySelectorAll(".login-tabs .tab").forEach((t) => t.addEventListener("click", () => setLoginMode(t.dataset.mode)));
$("#loginRule").textContent = `${cloud.NICK_RULE} 비밀번호는 ${cloud.PW_MIN}자 이상.`;
$("#btnLoginPwToggle").addEventListener("click", () => {
  const show = $("#loginPw").type === "password";
  $("#loginPw").type = $("#loginPw2").type = show ? "text" : "password";
  $("#btnLoginPwToggle").textContent = show ? "숨기기" : "보이기";
});

$("#loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const nick = $("#loginNick").value.trim();
  const pw = $("#loginPw").value;
  const err = (m) => { $("#loginError").textContent = m; };
  if (!cloud.checkNickname(nick)) return err(cloud.NICK_RULE);
  if (pw.length < cloud.PW_MIN) return err(`비밀번호는 ${cloud.PW_MIN}자 이상이어야 해요.`);
  if (loginMode === "signup" && pw !== $("#loginPw2").value) return err("비밀번호 확인이 달라요.");
  const btn = $("#btnLoginSubmit");
  btn.disabled = true; err("");
  applyMode($("#loginMobile").checked);
  try {
    const acc = loginMode === "signup" ? await cloud.signUp(nick, pw) : await cloud.signIn(nick, pw);
    await enterAccount(acc);
  } catch (ex) {
    err(ex.message);
  } finally {
    btn.disabled = false;
  }
});

const WARN_TEXT = `⚠ 마지막 접속 후 ${cloud.INACTIVE_DAYS}일 동안 접속하지 않으면 계정과 진행 상황이 자동으로 삭제돼요.`;
$("#loginWarn").textContent = WARN_TEXT;

function renderAccount() {
  if (!account) return;
  const fmt = (t) => new Date(t).toLocaleString("ko-KR", { dateStyle: "medium", timeStyle: "short" });
  $("#accNick").textContent = account.nickname;
  $("#accCreated").textContent = account.createdAt ? new Date(account.createdAt).toLocaleDateString("ko-KR") : "-";
  $("#accLastSeen").textContent = account.lastSeen ? fmt(account.lastSeen) : "-";
  $("#accSaved").textContent = cloudError ? "서버 저장 실패 (이 기기에는 저장됨, 다시 시도 중)"
    : lastSavedAt ? `서버에 저장됨 · ${new Date(lastSavedAt).toLocaleTimeString("ko-KR")}` : "-";
  const until = account.lastSeen ? Date.parse(account.lastSeen) + cloud.INACTIVE_DAYS * 86400000 : null;
  $("#accWarn").textContent = WARN_TEXT + (until ? ` 지금 접속을 끊으면 ${fmt(until)} 이후 삭제돼요.` : "");
  $("#accShortId").textContent = `ID : ${account.nickname}`;
  const short = (t) => { const d = new Date(t), p = (n) => String(n).padStart(2, "0"); return `${p(d.getMonth() + 1)}/${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}`; };
  $("#accShortDel").textContent = until ? `(미접속 시\n${short(until)} 삭제됨)` : "";
}

$("#btnLogout").addEventListener("click", async () => {
  await flushCloud();
  await cloud.signOut();
  showLogin();
});

$("#btnDeleteAccount").addEventListener("click", async () => {
  const typed = prompt(`계정과 모든 진행 상황이 영구히 삭제돼요.\n삭제하려면 닉네임(${account.nickname})을 입력하세요.`);
  if (typed == null) return;
  if (typed.trim() !== account.nickname) { toast("닉네임이 달라서 삭제하지 않았어요."); return; }
  try {
    await cloud.deleteAccount();
    try { localStorage.removeItem(localKey()); } catch { /* 무시 */ }
    clearTimeout(cloudTimer); cloudTimer = 0; cloudDirty = false;
    showLogin();
    toast("계정을 삭제했어요.");
  } catch (ex) {
    toast(ex.message);
  }
});

function bindGame() {
  game.onChange((info) => {
    if (info.type === "move" && info.dst.a === "inj") armSorter(); // 병을 꽂으면 2초 뒤 살펴봄
    // 인벤토리가 앞으로 당겨졌으면 선택한 칸 번호도 맞춤
    if (info.invMap && ui.sel?.a === "inv") {
      const count = game.s.inv.filter((x) => x != null).length;
      const i = ui.sel.i;
      const ni = info.invMap[i] ?? (i < count ? i : count ? count - 1 : null); // 빠진 칸이면 그 자리(=다음 물약), 마지막이었으면 바로 앞 물약
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

// ---------- 시작 ----------
// 예전 버전이 이 기기에 기억해 둔 비밀번호 지우기
try { Object.keys(localStorage).filter((k) => k.startsWith("witch-potion-pw:")).forEach((k) => localStorage.removeItem(k)); } catch { /* 무시 */ }
bindGame();
refresh();
(async () => {
  let acc = null;
  try { acc = await cloud.getAccount(); } catch (e) { console.warn(e); }
  if (acc) await enterAccount(acc);
  else showLogin();
})();

// 디버그/테스트용
window.__game = () => game;
