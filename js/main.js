import {
  COLORS, DAYS, SKILLS, SKILL_MAX, MAX_LEVEL, xpForLevel, ZONE3_LEVEL, ZONE4_LEVEL,
  POUR_BASE_MS, POUR_PER_UNIT_MS, INVENTORY_POUR_FACTOR, BREWERY_COUNT,
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
};

const ROOM_NAMES = {
  shelves: "선반 방",
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
    if (game.dropToPile(ui.sel, room, pos)) ui.sel = null;
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
  $("#hudRows").textContent = game.completedRows();
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

function describeSel() {
  if (!ui.sel) return null;
  if (ui.sel.a === "drum") {
    const d = game.s.drums[ui.sel.i];
    return `물통 ${ui.sel.i + 1} (${d.u.length}칸${d.u.length ? ", " + COLORS[d.u[0]].name : ""})`;
  }
  const it = game.item(game.itemAt(ui.sel));
  if (!it) return null;
  const inside = it.u.length ? it.u.map((c) => COLORS[c].name).join("·") : "비어 있음";
  return it.t === "f" ? `플라스크 [${inside}]` : `${COLORS[it.c].name}-${DAYS[it.d]} 약병 [${inside}]`;
}

function renderInfo() {
  const room = game.s.room;
  let help = "";
  if (room.startsWith("brewery")) help = "약병을 클릭하면 인벤토리로 가져와요. R: 선택한 약병을 바닥에 버리기. 우클릭: 선택한 병의 내용물을 다른 병에 붓기.";
  else if (room === "workshop") help = "클릭: 인벤토리 ↔ 1구역(플라스크)·2구역(약병) 이동. 우클릭: 병 선택 → 다른 병·물통을 우클릭하면 붓기 (같은 병을 다시 우클릭하면 선택 해제).";
  else help = ui.shelf == null ? "선반을 클릭하면 크게 볼 수 있어요." : "인벤토리 약병을 고른 뒤 빈 칸을 클릭해 올려요. 선반의 약병을 클릭하면 인벤토리로 돌아와요 (완성된 행은 제외).";
  const sel = describeSel();
  $("#info").replaceChildren(
    h("div", { class: "info-sel" }, sel ? h("span", {}, "선택: ", h("b", { text: sel })) : h("span", { class: "muted", text: "선택한 병 없음" })),
    h("div", { class: "info-help", text: help }),
    h("div", { class: "info-keys muted", text: "Q/E: 인벤토리 선택 · R: 버리기 · 우클릭: 붓기 · A/D: 이전/다음 방 · 1/2: 스킬 · M: 지도 · K: 스킬 창 · Esc: 선택 취소" }));
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

async function doPour(src, dst, n) {
  const factor = src.a === "inv" && dst.a === "inv" ? INVENTORY_POUR_FACTOR : 1;
  ui.pourMs = (POUR_BASE_MS + POUR_PER_UNIT_MS * n) * factor;
  ui.busy = true;
  ui.pouring = new Set([locKey(src), locKey(dst)]);
  ui.sel = src; // 부은 뒤에도 선택 유지
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
  if (game.s.room === "workshop" && (loc.a === "inv" || loc.a === "flask" || loc.a === "rack") && locHas(loc)) {
    quickMove(loc);
    return;
  }
  // 선반 방: 선반의 약병을 클릭하면 인벤토리로
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
    ui.sel = null;
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
  quickMove(ui.sel);
  // 버렸으면 다음 물약 자동 선택 (마지막 다음은 처음으로)
  if (game.itemAt({ a: "inv", i }) == null) {
    const n = game.invSize;
    let next = null;
    for (let k = 1; k <= n; k++) {
      const j = (i + k) % n;
      if (game.s.inv[j] != null) { next = j; break; }
    }
    ui.sel = next == null ? null : { a: "inv", i: next };
    refresh();
  }
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
  const el = e.target.closest("[data-loc]");
  if (el) { onLoc(parseLoc(el.dataset.loc)); return; }
  // 빈 곳 클릭 → 선택 해제 (조제실 바닥은 내려놓기에 쓰므로 제외)
  if (ui.sel && e.target.closest("#view") && !e.target.closest(".floor-world")) { ui.sel = null; refresh(); }
});
document.addEventListener("contextmenu", (e) => {
  if (!e.target.closest("#view, .inventory")) return;
  e.preventDefault(); // 게임 화면에서는 브라우저 메뉴 대신 붓기
  const el = e.target.closest("[data-loc]");
  if (el) pourInto(parseLoc(el.dataset.loc));
});

// ---------- 지도 ----------
function renderMap() {
  const room = (id, label, sub, cls = "") => {
    const b = h("button", { class: `map-room ${cls}` + (game.s.room === id ? " here" : "") },
      h("b", { text: label }), sub ? h("small", { text: sub }) : null);
    b.addEventListener("click", () => { goRoom(id); closeOverlay("#mapOverlay"); });
    return b;
  };
  const brew = (i) => room(`brewery${i}`, `조제실 ${i + 1}`, `약병 ${game.pileCount(i)}개`, "brewroom");
  const witch = h("div", { class: "map-room locked" }, h("b", { text: "마녀의 방" }), h("small", { text: "출입 금지" }));
  $("#mapGrid").replaceChildren(
    brew(0), brew(1), brew(2),
    room("workshop", "작업실", "색 맞추기", "wide"), room("shelves", "선반 방", `완성 ${game.completedRows()}행`),
    brew(3), brew(4), witch);
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
    const val = (l) => `${s.values[l - 1]}${s.unit}`;
    const cdText = s.cooldown ? ` · 대기 ${s.cooldown[lv - 1]}초` : "";
    const btn = h("button", { class: "btn primary small" });
    if (!unlocked) { btn.textContent = `Lv ${s.unlock}에 해금`; btn.disabled = true; }
    else if (cost == null) { btn.textContent = "최대"; btn.disabled = true; }
    else {
      btn.textContent = `강화 (${cost}P)`;
      btn.disabled = !game.canUpgrade(s.id);
      btn.addEventListener("click", () => { game.upgrade(s.id); renderSkills(); });
    }
    const pips = h("div", { class: "pips" }, Array.from({ length: SKILL_MAX }, (_, k) => h("i", { class: k < lv && unlocked ? "on" : "" })));
    return h("div", { class: "skill" + (unlocked ? "" : " locked") },
      h("div", { class: "skill-main" },
        h("div", { class: "skill-name" }, h("b", { text: s.name }), s.active ? h("span", { class: "tag", text: "사용" }) : null),
        h("div", { class: "skill-desc muted", text: s.desc }),
        h("div", { class: "skill-val" }, `현재 ${val(lv)}${cdText}`, cost != null ? ` → 다음 ${val(lv + 1)}` : "")),
      pips, btn);
  });
  $("#skillList").replaceChildren(...list);
}

// ---------- 사용 스킬 (1: 부름, 2: 자동 진열) ----------
const skillRt = { cdUntil: { summon: 0, autoShelve: 0 }, autoUntil: 0, lastTick: 0 };
const ACTIVE_KEYS = { summon: "1", autoShelve: "2" };

function useSkill(id) {
  const now = performance.now();
  const s = game.skillDef(id);
  const lv = game.s.skills[id];
  if (!game.skillUnlocked(id)) { toast(`${s.name}: 레벨 ${s.unlock}에 해금돼요.`); return; }
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
    if (active) {
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
    b.classList.toggle("cooling", !active && cd > 0);
    b.replaceChildren(
      h("kbd", { text: ACTIVE_KEYS[id] }), h("b", { text: s.name }), ` Lv${lv}`,
      h("small", { text: state }),
      h("i", { class: "cd", style: `width:${Math.min(1, frac) * 100}%` }));
  }
}

// 0.1초마다: 스킬 표시 갱신 + 자동 진열 동작
setInterval(() => {
  const now = performance.now();
  renderSkillBar();
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

/** A/D: 조제실 1~5 → 작업실 → 선반 방 → 조제실 1 순환 */
const ROOM_ORDER = [...Array.from({ length: BREWERY_COUNT }, (_, i) => `brewery${i}`), "workshop", "shelves"];
function stepRoom(dir) {
  if (ui.busy) return;
  const i = ROOM_ORDER.indexOf(game.s.room);
  goRoom(ROOM_ORDER[(i + dir + ROOM_ORDER.length) % ROOM_ORDER.length]);
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
try {
  if (!localStorage.getItem("witch-potion-intro")) {
    showIntro();
    localStorage.setItem("witch-potion-intro", "1");
  }
} catch { showIntro(); }

// 디버그/테스트용
window.__game = () => game;
