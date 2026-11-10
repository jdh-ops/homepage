// 조제실: 위쪽 가마솥, 아래쪽 창고 바닥에 물리 엔진으로 쌓인 약병 더미.
// 창고는 화면보다 깊어서 세로로 스크롤 (스크롤바는 숨김).
import { FLOOR_W, FLOOR_H, BOTTLE_W, BOTTLE_H } from "../config.js";
import { h, vial } from "./common.js";

const M = window.Matter;
const STEP_MS = 1000 / 60;

export function createBreweryView(ctx) {
  let roomIdx = -1;
  let root, store, world, countEl, peek;
  let engine = null;
  let scale = 1;
  let raf = 0;
  const bodies = new Map(); // id → body
  const els = new Map();    // id → element

  // ---------- 물리 ----------
  function newEngine() {
    const e = M.Engine.create({ enableSleeping: true });
    e.positionIterations = 8;
    e.velocityIterations = 6;
    const wall = (x, y, w, hh) => M.Bodies.rectangle(x, y, w, hh, { isStatic: true, friction: 0.8 });
    M.Composite.add(e.world, [
      wall(FLOOR_W / 2, FLOOR_H + 50, FLOOR_W + 400, 100), // 바닥
      wall(-50, FLOOR_H / 2 - 400, 100, FLOOR_H * 3),       // 왼쪽 벽
      wall(FLOOR_W + 50, FLOOR_H / 2 - 400, 100, FLOOR_H * 3),
    ]);
    return e;
  }

  function makeBody(id, x, y, a) {
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
    return b;
  }

  /** x 근처 더미 꼭대기(가장 작은 y) */
  function heapTopNear(x, range = BOTTLE_H) {
    let top = FLOOR_H;
    for (const b of bodies.values()) {
      if (Math.abs(b.position.x - x) < range) top = Math.min(top, b.bounds.min.y);
    }
    return top;
  }

  /** 처음 방에 들어왔을 때: 위치 없는 병들을 비처럼 떨어뜨려 화면 없이 쌓기 */
  function settleUnplaced(entries) {
    const perRow = Math.floor(FLOOR_W / (BOTTLE_W * 1.6));
    const base = Math.min(FLOOR_H, ...[...bodies.values()].map((b) => b.bounds.min.y)) - 40;
    entries.forEach((e, i) => {
      const row = Math.floor(i / perRow), col = i % perRow;
      const x = 20 + (col * (FLOOR_W - 40)) / perRow + Math.random() * 12;
      const y = base - row * (BOTTLE_H + 14) - Math.random() * 20;
      makeBody(e.id, x, y, (Math.random() - 0.5) * 1.4);
    });
    for (let k = 0; k < 2000; k++) {
      M.Engine.update(engine, STEP_MS);
      if (k > 60 && [...bodies.values()].every((b) => b.isSleeping)) break;
    }
    persist();
  }

  /** 빠진 병 주변과 그 위에 있던 병만 깨움 (나머지는 부딪히면 알아서 깨어남) */
  function wakeAround(x, y) {
    for (const b of bodies.values()) {
      if (Math.abs(b.position.x - x) < BOTTLE_H * 1.6 && b.position.y < y + BOTTLE_H * 0.6) M.Sleeping.set(b, false);
    }
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
      // 느린 컴퓨터에서도 같은 속도로: 밀린 만큼 여러 번 계산 (최대 4번)
      let n = Math.min(4, Math.max(1, Math.round((now - last) / STEP_MS)));
      last = now;
      while (n--) M.Engine.update(engine, STEP_MS);
      draw();
      const moving = [...bodies.values()].some((b) => !b.isSleeping);
      if (moving) raf = requestAnimationFrame(tick);
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
    scale = (store.clientWidth || 1000) / FLOOR_W;
    world.style.height = FLOOR_H * scale + "px";
    world.style.setProperty("--vw", BOTTLE_W * scale + "px");
  }

  function draw() {
    const w = BOTTLE_W * scale, hh = BOTTLE_H * scale;
    for (const [id, b] of bodies) {
      const el = els.get(id);
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
      wakeAround(b.position.x, b.position.y);
      M.Composite.remove(engine.world, b);
      bodies.delete(id);
      els.get(id)?.remove();
      els.delete(id);
      changed = true;
    }
    // 새로 떨어진 병
    for (const e of list) {
      if (bodies.has(e.id)) continue;
      const x = e.x ?? 30 + Math.random() * (FLOOR_W - 60);
      const y = e.y ?? heapTopNear(x) - BOTTLE_H;
      makeBody(e.id, x, y, (Math.random() - 0.5) * 0.6);
      elFor(e.id);
      changed = true;
    }
    if (changed) run();
    draw();
  }

  // ---------- 만들기 ----------
  function build(r) {
    roomIdx = r;
    els.clear();
    bodies.clear();
    countEl = h("span", { class: "count" });
    world = h("div", { class: "floor-world" });
    store = h("div", { class: "store" }, world);
    peek = h("div", { class: "pile-peek" });
    root = h("div", { class: "room brewery" },
      h("div", { class: "cauldron-area" },
        h("div", { class: "cauldron" },
          h("div", { class: "brew" }, h("i"), h("i"), h("i"), h("i")),
          h("div", { class: "pot" }),
          h("div", { class: "fire" })),
        h("div", { class: "room-caption" }, h("b", { text: `조제실 ${r + 1}` }), " · 남은 약병 ", countEl,
          h("div", { class: "muted small", text: "휠로 아래까지 내려 볼 수 있어요" }))),
      store, peek);

    world.addEventListener("click", (e) => {
      const b = e.target.closest("[data-pile]");
      if (b) { ctx.takeFromPile(roomIdx, +b.dataset.pile); return; }
      // 빈 곳 클릭: 선택한 인벤토리 약병을 그 위치(더미보다 위)에서 떨어뜨림
      const rect = world.getBoundingClientRect();
      const x = Math.max(20, Math.min(FLOOR_W - 20, (e.clientX - rect.left) / scale));
      const y = Math.min((e.clientY - rect.top) / scale, heapTopNear(x) - BOTTLE_H);
      ctx.dropToPile(roomIdx, { x, y });
    });

    // 마우스를 올리면 크게 보기
    world.addEventListener("mouseover", (e) => {
      const b = e.target.closest("[data-pile]");
      if (!b) { peek.classList.remove("show"); return; }
      peek.replaceChildren(vial(ctx.game.item(+b.dataset.pile)));
      peek.classList.add("show");
    });
    world.addEventListener("mousemove", (e) => {
      peek.style.left = e.clientX + 18 + "px";
      peek.style.top = e.clientY - 50 + "px";
    });
    world.addEventListener("mouseleave", () => peek.classList.remove("show"));
    return root;
  }

  return {
    mount(container, r) {
      stop();
      engine = newEngine();
      container.replaceChildren(build(r));
      measure();
      const list = ctx.game.s.floor[r];
      for (const e of list) if (e.x != null && !e.drop) makeBody(e.id, e.x, e.y, e.a);
      const unplaced = list.filter((e) => e.x == null && !e.drop);
      if (unplaced.length) settleUnplaced(unplaced);
      for (const id of bodies.keys()) elFor(id);
      sync(); // 떨어지던 중에 저장된 병 처리
      // 더미 꼭대기가 보이도록 스크롤
      const top = Math.min(FLOOR_H, ...[...bodies.values()].map((b) => b.bounds.min.y));
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
