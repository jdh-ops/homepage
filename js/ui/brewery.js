// 창고: 바닥에 물리 엔진으로 쌓인 약병 더미.
// 창고는 화면보다 깊어서 세로로 스크롤 (스크롤바는 숨김).
import { BOTTLE_W, BOTTLE_H } from "../config.js";
import { h, vial } from "./common.js";

const M = window.Matter;
const STEP_MS = 1000 / 60;
const MAX_FALL_MS = 4000; // 이 시간이 지나면 떨어지던 병도 그 자리에 고정

// 렉 줄이기: 평소엔 모든 병을 고정(static)해 두고,
// 병을 빼면 그 병과 닿아 있던 병, 그 병들과 닿아 있던 병까지만 풀어서 떨어뜨림 (더 번지지 않음)

export function createBreweryView(ctx) {
  let roomIdx = -1;
  let FW = 900, FH = 620; // 바닥 크기(물리 단위). PC/모바일에 따라 mount 때 정함
  let root, store, world, countEl;
  let engine = null;
  let scale = 1;
  let raf = 0;
  const bodies = new Map(); // id → body
  const els = new Map();    // id → element
  const active = new Map(); // 떨어지는 중인 병: id → 풀려난 시각

  // ---------- 물리 ----------
  function newEngine() {
    const e = M.Engine.create({ enableSleeping: true });
    e.positionIterations = 8;
    e.velocityIterations = 6;
    const wall = (x, y, w, hh) => M.Bodies.rectangle(x, y, w, hh, { isStatic: true, friction: 0.8 });
    M.Composite.add(e.world, [
      wall(FW / 2, FH + 50, FW + 400, 100), // 바닥
      wall(-50, (FH - 6000) / 2, 100, FH + 6000),      // 왼쪽 벽 (위로 높게: 처음 쌓을 때 병이 위에서 떨어짐)
      wall(FW + 50, (FH - 6000) / 2, 100, FH + 6000),
    ]);
    return e;
  }

  function freeze(b) {
    M.Body.setVelocity(b, { x: 0, y: 0 });
    M.Body.setAngularVelocity(b, 0);
    M.Body.setStatic(b, true);
  }

  function release(b) {
    if (b.isStatic) M.Body.setStatic(b, false);
    M.Sleeping.set(b, false);
    active.set(b.plugin.id, performance.now());
  }

  function makeBody(id, x, y, a, dynamic = false) {
    const b = M.Bodies.rectangle(x, y, BOTTLE_W, BOTTLE_H, {
      chamfer: { radius: 6 },
      angle: a,
      friction: 0.6,
      frictionStatic: 0.9,
      restitution: 0.05,
      density: 0.002,
    });
    b.plugin.id = id;
    bodies.set(id, b);
    M.Composite.add(engine.world, b);
    if (dynamic) release(b);
    else M.Body.setStatic(b, true);
    return b;
  }

  /** x 근처 더미 꼭대기(가장 작은 y) */
  function heapTopNear(x, range = BOTTLE_H) {
    let top = FH;
    for (const b of bodies.values()) {
      if (Math.abs(b.position.x - x) < range) top = Math.min(top, b.bounds.min.y);
    }
    return top;
  }

  /** 처음 방에 들어왔을 때: 위치 없는 병들을 비처럼 떨어뜨려 화면 없이 쌓기 */
  function settleUnplaced(entries) {
    const perRow = Math.floor(FW / (BOTTLE_W * 1.6));
    const base = Math.min(FH, ...[...bodies.values()].map((b) => b.bounds.min.y)) - 40;
    entries.forEach((e, i) => {
      const row = Math.floor(i / perRow), col = i % perRow;
      const x = 20 + (col * (FW - 40)) / perRow + Math.random() * 12;
      const y = base - row * (BOTTLE_H + 14) - Math.random() * 20;
      makeBody(e.id, x, y, (Math.random() - 0.5) * 1.4, true);
    });
    for (let k = 0; k < 2000; k++) {
      M.Engine.update(engine, STEP_MS);
      if (k > 60 && [...bodies.values()].every((b) => b.isStatic || b.isSleeping)) break;
    }
    for (const b of bodies.values()) if (!b.isStatic) freeze(b);
    active.clear();
    persist();
  }

  /** b와 실제로 닿아 있는 병들 (아래에 깔린 병은 제외: 위·옆만) */
  function touching(b, exclude) {
    // 살짝(가장자리 4단위) 큰 모양으로 겹치는 병 = 닿아 있는 병
    const probe = M.Bodies.rectangle(b.position.x, b.position.y, BOTTLE_W + 8, BOTTLE_H + 8, {
      angle: b.angle, chamfer: { radius: 10 },
    });
    const near = [...bodies.values()].filter((o) =>
      !exclude.has(o) && o.position.y < b.position.y + BOTTLE_H * 0.3 &&
      M.Bounds.overlaps(o.bounds, probe.bounds));
    return M.Query.collides(probe, near).map((c) => (c.bodyA === probe ? c.bodyB : c.bodyA));
  }

  /** 빠진 병과 닿아 있던 병 + 그 병들과 닿아 있던 병까지만 풀어 줌 (더 번지지 않음) */
  function releaseTouching(removed) {
    const seen = new Set([removed]);
    const first = touching(removed, seen);
    first.forEach((b) => seen.add(b));
    const second = [];
    for (const b of first) for (const o of touching(b, seen)) { seen.add(o); second.push(o); }
    for (const b of [...first, ...second]) release(b);
  }

  function persist() {
    const pos = new Map();
    for (const [id, b] of bodies) pos.set(id, { x: b.position.x, y: b.position.y, a: b.angle });
    ctx.game.setFloorPositions(roomIdx, pos);
    ctx.saveSoon();
  }

  function run() {
    if (raf) return;
    let last = performance.now();
    const tick = (now) => {
      // 느린 컴퓨터에서도 같은 속도로: 밀린 만큼 여러 번 계산 (최대 2번)
      let n = Math.min(2, Math.max(1, Math.round((now - last) / STEP_MS)));
      last = now;
      while (n--) M.Engine.update(engine, STEP_MS);
      draw(active.keys());
      // 멈췄거나 너무 오래 떨어지는 병은 고정
      for (const [id, t0] of active) {
        const b = bodies.get(id);
        if (!b) { active.delete(id); continue; }
        if (b.isSleeping || now - t0 > MAX_FALL_MS) { freeze(b); active.delete(id); }
      }
      if (active.size) raf = requestAnimationFrame(tick);
      else { raf = 0; persist(); }
    };
    raf = requestAnimationFrame(tick);
  }

  function stop() {
    if (raf) cancelAnimationFrame(raf);
    raf = 0;
  }

  // ---------- 그리기 ----------
  function measure() {
    scale = (store.clientWidth || 1000) / FW;
    world.style.height = FH * scale + "px";
    world.style.setProperty("--vw", BOTTLE_W * scale + "px");
  }

  /** ids를 주면 그 병들만 다시 그림 (떨어지는 병만) */
  function draw(ids = bodies.keys()) {
    const w = BOTTLE_W * scale, hh = BOTTLE_H * scale;
    for (const id of ids) {
      const b = bodies.get(id);
      const el = els.get(id);
      if (!b) continue;
      if (!el) continue;
      el.style.transform =
        `translate(${b.position.x * scale - w / 2}px, ${b.position.y * scale - hh / 2}px) rotate(${b.angle}rad)`;
    }
  }

  function elFor(id) {
    let el = els.get(id);
    if (!el) {
      el = h("div", { class: "pile-item", "data-pile": id });
      el.append(vial(ctx.game.item(id)));
      world.append(el);
      els.set(id, el);
    }
    return el;
  }

  /** 게임 상태와 화면/물리 맞추기 */
  function sync() {
    const list = ctx.game.s.floor[roomIdx];
    countEl.textContent = list.length;
    const ids = new Set(list.map((e) => e.id));
    let changed = false;

    // 사라진 병 (집어 감, 부름)
    for (const [id, b] of bodies) {
      if (ids.has(id)) continue;
      M.Composite.remove(engine.world, b);
      bodies.delete(id);
      active.delete(id);
      releaseTouching(b);
      els.get(id)?.remove();
      els.delete(id);
      changed = true;
    }
    // 새로 떨어진 병
    for (const e of list) {
      if (bodies.has(e.id)) continue;
      const x = e.x ?? 30 + Math.random() * (FW - 60);
      const y = e.y ?? heapTopNear(x) - BOTTLE_H;
      makeBody(e.id, x, y, (Math.random() - 0.5) * 0.6, true);
      elFor(e.id);
      draw([e.id]);
      changed = true;
    }
    if (changed && active.size) run();
  }

  // ---------- 만들기 ----------
  function build(r) {
    roomIdx = r;
    els.clear();
    bodies.clear();
    countEl = h("span", { class: "count" });
    world = h("div", { class: "floor-world" });
    store = h("div", { class: "store" }, world);
    root = h("div", { class: "room brewery" },
      h("div", { class: "room-caption brewery-caption" }, h("b", { text: `창고 ${r + 1}` }), " · 남은 약병 ", countEl),
      store);

    world.addEventListener("click", (e) => {
      const b = e.target.closest("[data-pile]");
      if (b) { ctx.takeFromPile(roomIdx, +b.dataset.pile); return; }
      // 빈 곳 클릭: 선택한 인벤토리 약병을 그 위치(더미보다 위)에서 떨어뜨림
      const rect = world.getBoundingClientRect();
      const x = Math.max(20, Math.min(FW - 20, (e.clientX - rect.left) / scale));
      const y = Math.min((e.clientY - rect.top) / scale, heapTopNear(x) - BOTTLE_H);
      ctx.dropToPile(roomIdx, { x, y });
    });

    return root;
  }

  return {
    mount(container, r) {
      stop();
      ({ w: FW, h: FH } = ctx.floorSize());
      engine = newEngine();
      container.replaceChildren(build(r));
      measure();
      const list = ctx.game.s.floor[r];
      for (const e of list) if (e.x != null && !e.drop) makeBody(e.id, e.x, e.y, e.a);
      const unplaced = list.filter((e) => e.x == null && !e.drop);
      if (unplaced.length) settleUnplaced(unplaced);
      for (const id of bodies.keys()) elFor(id);
      draw();
      sync(); // 떨어지던 중에 저장된 병 처리
      // 더미 꼭대기가 보이도록 스크롤
      const top = Math.min(FH, ...[...bodies.values()].map((b) => b.bounds.min.y));
      store.scrollTop = Math.max(0, top * scale - 40);
    },
    update() { if (root?.isConnected) sync(); },
    resize() {
      if (!root?.isConnected) return;
      measure();
      draw();
    },
    unmount() {
      if (raf) { stop(); persist(); } // 떨어지던 중이면 지금 위치라도 저장
    },
    get room() { return roomIdx; },
  };
}
