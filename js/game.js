// 게임 상태와 규칙. 화면과 무관하게 동작한다.
import {
  COLORS, DAYS, UNITS_PER_BOTTLE, BOTTLES_PER_LABEL, SHELF_ROWS, BREWERY_COUNT,
  ROW_XP, levelFromXp, xpForLevel, TEST_START_LEVEL, SKILLS, SKILL_COSTS, SKILL_MAX,
  MAX_FLASKS, MAX_RACK, MAX_DRUMS, MAX_INVENTORY, SORTER_INJECTORS, ZONE3_LEVEL, ZONE4_LEVEL,
} from "./config.js";

const NC = COLORS.length;
const ND = DAYS.length;

// ---------- 난수 ----------
function mulberry32(a) {
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function shuffle(arr, rand) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

// ---------- 새 게임 ----------
export function newGameState(seed = (Date.now() ^ (Math.random() * 1e9)) >>> 0) {
  const rand = mulberry32(seed);
  const items = [];

  // 라벨: 색 7 × 요일 7 × 30병
  const labels = [];
  for (let c = 0; c < NC; c++) for (let d = 0; d < ND; d++) for (let k = 0; k < BOTTLES_PER_LABEL; k++) labels.push([c, d]);
  shuffle(labels, rand);

  // 내용물: 색마다 (라벨 수 × 4)칸을 모아 섞은 뒤 4칸씩 나눔
  const units = [];
  for (let c = 0; c < NC; c++) for (let k = 0; k < ND * BOTTLES_PER_LABEL * UNITS_PER_BOTTLE; k++) units.push(c);
  shuffle(units, rand);

  labels.forEach(([c, d], i) => {
    items.push({ id: i, t: "b", c, d, u: units.slice(i * UNITS_PER_BOTTLE, (i + 1) * UNITS_PER_BOTTLE) });
  });

  // 플라스크 30개 (해금된 수만큼 1구역에 놓임)
  const flaskSlots = new Array(MAX_FLASKS).fill(null);
  for (let k = 0; k < MAX_FLASKS; k++) {
    const id = items.length;
    items.push({ id, t: "f", u: [] });
    flaskSlots[k] = id;
  }

  // 조제실 5곳에 고르게 나눔. 위치(x, y, a)는 처음 방에 들어갈 때 물리 엔진이 쌓아서 정함
  const bottleIds = shuffle(labels.map((_, i) => i), rand);
  const per = Math.ceil(bottleIds.length / BREWERY_COUNT);
  const floor = [];
  for (let r = 0; r < BREWERY_COUNT; r++) floor.push(bottleIds.slice(r * per, (r + 1) * per).map((id) => ({ id, x: null, y: null, a: 0 })));

  const skills = {};
  for (const s of SKILLS) skills[s.id] = s.start ?? 1;

  return {
    v: 1,
    seed,
    items,
    floor,
    inv: new Array(MAX_INVENTORY).fill(null),
    flasks: flaskSlots,
    rack: new Array(MAX_RACK).fill(null),
    drums: Array.from({ length: MAX_DRUMS }, () => ({ u: [] })),
    sorter: { inj: new Array(SORTER_INJECTORS).fill(null), store: [] },
    shelves: Array.from({ length: NC }, () => Array.from({ length: SHELF_ROWS }, () => new Array(ND).fill(null))),
    lockedRows: Array.from({ length: NC }, () => new Array(SHELF_ROWS).fill(false)),
    xp: 0,
    skills,
    room: "workshop",
  };
}

// ---------- 게임 객체 ----------
export class Game {
  constructor(state) {
    this.s = state;
    this.listeners = new Set();
    this.migrate();
  }

  /** 예전 세이브 보정: 열 방식 더미(piles) → 바닥 위치 방식(floor) */
  migrate() {
    // 스킬 개편: 물통 개수+크기 → '물통' 하나, 물통·분류기·사용 스킬은 0레벨 시작 (해당 스킬은 초기화)
    if (this.s.skills.drumCount !== undefined) {
      delete this.s.skills.drumCount;
      delete this.s.skills.drumSize;
      for (const id of ["drum", "sorterCap", "summon", "autoShelve"]) this.s.skills[id] = 0;
    }
    for (const s of SKILLS) if (this.s.skills[s.id] == null) this.s.skills[s.id] = s.start ?? 1;
    // 경험치 = 완성한 행 × ROW_XP (경험치 단위가 바뀌어도 맞도록 다시 계산)
    // (임시 테스트: 시작 레벨만큼의 경험치를 더해 줌. TEST_START_LEVEL = 1이면 0)
    this.s.xp = this.completedRows() * ROW_XP + xpForLevel(TEST_START_LEVEL);
    // 레벨이 내려가서 쓴 포인트가 받은 포인트보다 많으면: 스킬을 처음 상태로 되돌리고 포인트 돌려줌
    if (this.skillPoints < 0) {
      for (const sk of SKILLS) this.s.skills[sk.id] = sk.start ?? 1;
      // 줄어든 인벤토리 칸 밖에 있던 병은 거치대/플라스크 자리로 (자리 없으면 그대로 두었다가 칸이 늘면 다시 보임)
      for (let i = this.invSize; i < this.s.inv.length; i++) {
        const id = this.s.inv[i];
        if (id == null) continue;
        const dst = this.firstFree(this.item(id).t === "f" ? "flask" : "rack", id);
        if (dst) { this.s.inv[i] = null; this.setAt(dst, id); }
      }
      this.skillsReset = true;
    }
    this.compactInventory();
    if (!this.s.sorter) this.s.sorter = { inj: new Array(SORTER_INJECTORS).fill(null), store: [] };
    // 잠긴 주입기에 꽂혀 있던 병은 인벤토리나 거치대/플라스크 자리로
    this.s.sorter.inj.forEach((id, i) => {
      if (id == null || i < this.sorterInjectors) return;
      const it = this.item(id);
      const dst = this.firstFree("inv", id) || this.firstFree(it.t === "f" ? "flask" : "rack", id);
      if (dst) { this.s.sorter.inj[i] = null; this.setAt(dst, id); }
    });
    if (!this.s.floor && this.s.piles) {
      this.s.floor = this.s.piles.map((cols) => cols.flat().map((id) => ({ id, x: null, y: null, a: 0 })));
      delete this.s.piles;
    }
  }

  onChange(fn) { this.listeners.add(fn); }
  changed(info) { for (const fn of this.listeners) fn(info); }

  // ----- 레벨 / 스킬 -----
  get level() { return levelFromXp(this.s.xp); }
  spentPoints() {
    let sum = 0;
    for (const s of SKILLS) for (let l = s.start ?? 1; l < this.s.skills[s.id]; l++) sum += SKILL_COSTS[l];
    return sum;
  }
  get skillPoints() { return this.level - 1 - this.spentPoints(); }
  skillDef(id) { return SKILLS.find((s) => s.id === id); }
  skillUnlocked(id) { return this.level >= this.skillDef(id).unlock; }
  /** 스킬 값 (0레벨이면 null) */
  skillValue(id) { const lv = this.s.skills[id]; return lv > 0 ? this.skillDef(id).values[lv - 1] : null; }
  skillExtra(id) { const lv = this.s.skills[id]; return lv > 0 ? this.skillDef(id).extra.values[lv - 1] : null; }
  hasSkill(id) { return this.s.skills[id] > 0; }
  upgradeCost(id) {
    const lv = this.s.skills[id];
    return lv >= SKILL_MAX ? null : SKILL_COSTS[lv];
  }
  canUpgrade(id) {
    const cost = this.upgradeCost(id);
    return cost != null && this.skillUnlocked(id) && this.skillPoints >= cost;
  }
  upgrade(id) {
    if (!this.canUpgrade(id)) return false;
    this.s.skills[id]++;
    this.changed({ type: "skill", id });
    return true;
  }

  /** 구역을 실제로 쓸 수 있나: 레벨 도달 + 스킬 1레벨 이상 */
  zoneUsable(n) {
    if (n === 3) return this.zoneUnlocked(3) && this.hasSkill("drum");
    if (n === 4) return this.zoneUnlocked(4) && this.hasSkill("sorterCap");
    return true;
  }

  zoneUnlocked(n) {
    if (n === 3) return this.level >= ZONE3_LEVEL;
    if (n === 4) return this.level >= ZONE4_LEVEL;
    return true;
  }

  get invSize() { return this.skillValue("inventory"); }
  get flaskCount() { return this.skillValue("flasks"); }
  get rackCount() { return this.skillValue("rack"); }
  get drumCount() { return this.zoneUsable(3) ? this.skillExtra("drum") : 0; }
  get drumCap() { return this.skillValue("drum") ?? 0; }

  // ----- 위치 -----
  // loc: {a:'inv'|'flask'|'rack'|'drum'|'shelf'|'pile', ...}
  item(id) { return id == null ? null : this.s.items[id]; }

  slotValid(loc) {
    switch (loc.a) {
      case "inv": return loc.i < this.invSize;
      case "flask": return loc.i < this.flaskCount;
      case "rack": return loc.i < this.rackCount;
      case "drum": return loc.i < this.drumCount;
      case "inj": return loc.i < this.sorterInjectors;
      case "shelf": return true;
      default: return false;
    }
  }

  itemAt(loc) {
    switch (loc.a) {
      case "inv": return this.s.inv[loc.i];
      case "flask": return this.s.flasks[loc.i];
      case "rack": return this.s.rack[loc.i];
      case "inj": return this.s.sorter.inj[loc.i];
      case "shelf": return this.s.shelves[loc.c][loc.r][loc.d];
      default: return null;
    }
  }

  setAt(loc, id) {
    switch (loc.a) {
      case "inv": this.s.inv[loc.i] = id; break;
      case "flask": this.s.flasks[loc.i] = id; break;
      case "rack": this.s.rack[loc.i] = id; break;
      case "inj": this.s.sorter.inj[loc.i] = id; break;
      case "shelf": this.s.shelves[loc.c][loc.r][loc.d] = id; break;
      default: throw new Error("bad loc " + loc.a);
    }
  }

  /** 붓기 대상이 되는 내용물 {u, cap, drum} */
  container(loc) {
    if (loc.a === "drum") return { u: this.s.drums[loc.i].u, cap: this.drumCap, drum: true };
    if (loc.a === "shelf" || loc.a === "pile") return null;
    const it = this.item(this.itemAt(loc));
    return it ? { u: it.u, cap: UNITS_PER_BOTTLE, drum: false } : null;
  }

  // ----- 붓기 -----
  pourAmount(src, dst) {
    if (sameLoc(src, dst)) return 0;
    if (!this.slotValid(src) || !this.slotValid(dst)) return 0;
    const S = this.container(src), D = this.container(dst);
    if (!S || !D || !S.u.length) return 0;
    const color = S.u[S.u.length - 1];
    let run = 0;
    for (let i = S.u.length - 1; i >= 0 && S.u[i] === color; i--) run++;
    // 물통은 같은 색만
    if (D.drum && D.u.length && D.u[D.u.length - 1] !== color) return 0;
    return Math.min(run, D.cap - D.u.length);
  }

  pour(src, dst) {
    const n = this.pourAmount(src, dst);
    if (!n) return 0;
    const S = this.container(src), D = this.container(dst);
    for (let k = 0; k < n; k++) D.u.push(S.u.pop());
    this.changed({ type: "pour", src, dst, n });
    return n;
  }

  // ----- 옮기기 -----
  isComplete(it) {
    return it && it.u.length === UNITS_PER_BOTTLE && it.u.every((c) => c === it.u[0]);
  }

  /** 아이템을 그 칸에 놓을 수 있나 (칸이 비어 있다고 가정하지 않음) */
  accepts(loc, id) {
    const it = this.item(id);
    if (!it || !this.slotValid(loc) || this.itemAt(loc) != null) return false;
    switch (loc.a) {
      case "inv": return true;
      case "flask": return it.t === "f";
      case "rack": return it.t === "b";
      case "inj": return true; // 약병, 플라스크 모두
      case "shelf": return it.t === "b" && this.isComplete(it) && !this.s.lockedRows[loc.c][loc.r];
      default: return false;
    }
  }

  canTake(loc) {
    if (this.itemAt(loc) == null) return false;
    if (loc.a === "shelf" && this.s.lockedRows[loc.c][loc.r]) return false;
    return true;
  }

  move(src, dst) {
    const id = this.itemAt(src);
    if (id == null || !this.canTake(src) || !this.accepts(dst, id)) return false;
    this.setAt(src, null);
    this.setAt(dst, id);
    const info = { type: "move", src, dst, id };
    if (src.a === "inv") info.invMap = this.compactInventory();
    if (dst.a === "shelf") info.row = this.checkRow(dst.c, dst.r);
    this.changed(info);
    return true;
  }

  /** 인벤토리 빈칸을 없애고 앞으로 당김. 반환: 옛 칸 번호 → 새 칸 번호 */
  compactInventory() {
    const map = {};
    const kept = [];
    this.s.inv.forEach((id, i) => { if (id != null) { map[i] = kept.length; kept.push(id); } });
    this.s.inv = this.s.inv.map((_, i) => kept[i] ?? null);
    return map;
  }

  firstFree(area, id) {
    const n = area === "inv" ? this.invSize : area === "flask" ? this.flaskCount : this.rackCount;
    for (let i = 0; i < n; i++) {
      const loc = { a: area, i };
      if (this.accepts(loc, id)) return loc;
    }
    return null;
  }

  // ----- 분류기 (4구역) -----
  get sorterCap() { return this.skillValue("sorterCap") ?? 0; }
  get sorterInjectors() { return this.zoneUsable(4) ? this.skillExtra("sorterCap") : 0; }

  /** 밸브: 주입기에 꽂힌 병의 내용물을 전부(위에서부터) 저장 공간으로. 꽉 차면 멈춤 */
  sorterInject(i) {
    const it = this.item(this.s.sorter.inj[i]);
    if (!it || !it.u.length) return 0;
    const st = this.s.sorter.store;
    let n = 0;
    while (it.u.length && st.length < this.sorterCap) { st.push(it.u.pop()); n++; }
    if (n) this.changed({ type: "sorterInject", i, n });
    return n;
  }

  /** 주입기의 병이 원하는 색: 맨 위 색, 비어 있으면 약병은 라벨 색, 빈 플라스크는 저장 공간 첫 칸의 색 */
  sorterWant(it) {
    if (!it || it.u.length >= UNITS_PER_BOTTLE) return null;
    if (it.u.length) return it.u[it.u.length - 1];
    if (it.t === "b") return it.c;
    return this.s.sorter.store[0] ?? null;
  }

  /** 병을 살펴보고 원하는 색을 가득 찰 때까지(있는 만큼) 채워 줌 */
  sorterDispense() {
    const st = this.s.sorter.store;
    let total = 0;
    this.s.sorter.inj.forEach((id) => {
      const it = this.item(id);
      const c = this.sorterWant(it);
      if (c == null) return;
      while (it.u.length < UNITS_PER_BOTTLE) {
        const k = st.lastIndexOf(c);
        if (k < 0) break;
        st.splice(k, 1);
        it.u.push(c);
        total++;
      }
    });
    if (total) this.changed({ type: "sorterDispense", n: total });
    return total;
  }

  // ----- 조제실 바닥 -----
  takeFromPile(room, id) {
    const list = this.s.floor[room];
    const k = list.findIndex((e) => e.id === id);
    if (k < 0) return false;
    const dst = this.firstFree("inv", id);
    if (!dst) return false;
    list.splice(k, 1);
    this.setAt(dst, id);
    this.changed({ type: "pileTake", room, id, dst });
    return true;
  }

  /** 인벤토리 약병을 바닥에 버리기. pos(물리 단위)가 없으면 화면이 더미 위쪽 아무 데나 떨어뜨림 */
  dropToPile(src, room, pos = null) {
    const id = this.itemAt(src);
    const it = this.item(id);
    if (!it || it.t !== "b" || !this.canTake(src)) return false;
    this.setAt(src, null);
    this.s.floor[room].push({ id, x: pos?.x ?? null, y: pos?.y ?? null, a: 0, drop: true });
    const invMap = src.a === "inv" ? this.compactInventory() : null;
    this.changed({ type: "pileDrop", room, id, invMap });
    return true;
  }

  pileCount(room) {
    return this.s.floor[room].length;
  }

  /** 물리 엔진이 멈춘 뒤 병 위치 기록 (화면 갱신 없이 저장만) */
  setFloorPositions(room, posById) {
    for (const e of this.s.floor[room]) {
      const p = posById.get(e.id);
      if (!p) continue;
      e.x = Math.round(p.x * 10) / 10;
      e.y = Math.round(p.y * 10) / 10;
      e.a = Math.round(p.a * 1000) / 1000;
      delete e.drop;
    }
  }

  /** 부름: 같은 방 바닥에서 라벨 색이 같은 약병을 위쪽부터 최대 n개 인벤토리로 */
  summon(room, color, n) {
    const list = this.s.floor[room];
    const found = list.filter((e) => this.item(e.id).c === color).sort((a, b) => (a.y ?? 0) - (b.y ?? 0));
    let got = 0, lastDst = null;
    for (const f of found) {
      if (got >= n) break;
      const dst = this.firstFree("inv", f.id);
      if (!dst) break;
      list.splice(list.indexOf(f), 1);
      this.setAt(dst, f.id);
      lastDst = dst;
      got++;
    }
    if (got) this.changed({ type: "summon", room, n: got, dst: lastDst });
    return got;
  }

  /** 자동 진열: 인벤토리에서 c색 선반에 맞는 완성 약병 하나를 빈 칸에 넣기 */
  autoShelveOne(c) {
    for (let i = 0; i < this.invSize; i++) {
      const src = { a: "inv", i };
      const it = this.item(this.itemAt(src));
      if (!it || it.t !== "b" || it.c !== c || !this.isComplete(it) || it.u[0] !== c) continue;
      for (let r = 0; r < SHELF_ROWS; r++) {
        const dst = { a: "shelf", c, r, d: it.d };
        if (this.accepts(dst, it.id)) { this.move(src, dst); return dst; }
      }
    }
    return null;
  }

  // ----- 선반 -----
  /** 칸이 올바른가: 내용물 색 = 라벨 색 = 선반 색, 라벨 요일 = 열 */
  cellOk(c, r, d) {
    const it = this.item(this.s.shelves[c][r][d]);
    if (!it) return null;
    return it.u[0] === it.c && it.c === c && it.d === d;
  }

  checkRow(c, r) {
    if (this.s.lockedRows[c][r]) return null;
    for (let d = 0; d < ND; d++) if (!this.cellOk(c, r, d)) return null;
    const before = this.level;
    this.s.lockedRows[c][r] = true;
    this.s.xp += ROW_XP;
    return { c, r, xp: ROW_XP, levelUp: this.level - before };
  }

  completedRows() {
    return this.s.lockedRows.reduce((a, rows) => a + rows.filter(Boolean).length, 0);
  }

  shelfCount(c) {
    let n = 0;
    for (const row of this.s.shelves[c]) for (const id of row) if (id != null) n++;
    return n;
  }

  // ----- 방 -----
  setRoom(room) {
    this.s.room = room;
    this.changed({ type: "room", room });
  }
}

export function sameLoc(a, b) {
  if (!a || !b || a.a !== b.a) return false;
  if (a.a === "shelf") return a.c === b.c && a.r === b.r && a.d === b.d;
  return a.i === b.i;
}
