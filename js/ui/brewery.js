// 조제실: 위쪽 가마솥, 아래쪽 창고에 약병 더미.
import { PILE_COLUMNS, PILE_MAX_HEIGHT } from "../config.js";
import { h, vial } from "./common.js";

// 아이템마다 고정된 흐트러짐 (매번 같은 자리에 그려지도록)
function jitter(id, salt) {
  let x = (id + 1) * 2654435761 + salt * 40503;
  x = (x ^ (x >>> 13)) * 1274126177;
  return (((x ^ (x >>> 16)) >>> 0) % 1000) / 1000 - 0.5; // -0.5 ~ 0.5
}

export function createBreweryView(ctx) {
  let roomIdx = -1;
  let root, pileEl, countEl;
  const els = new Map(); // id → element

  function build(r) {
    roomIdx = r;
    els.clear();
    countEl = h("span", { class: "count" });
    pileEl = h("div", { class: "pile" });
    root = h("div", { class: "room brewery" },
      h("div", { class: "cauldron-area" },
        h("div", { class: "cauldron" },
          h("div", { class: "brew" }, h("i"), h("i"), h("i"), h("i")),
          h("div", { class: "pot" }),
          h("div", { class: "fire" })),
        h("div", { class: "room-caption" }, h("b", { text: `조제실 ${r + 1}` }), " · 남은 약병 ", countEl)),
      h("div", { class: "store" }, pileEl));

    pileEl.addEventListener("click", (e) => {
      const b = e.target.closest("[data-pile]");
      if (b) { ctx.takeFromPile(roomIdx, +b.dataset.pile); return; }
      // 바닥 클릭: 선택한 인벤토리 약병을 그 열에 내려놓기
      const rect = pileEl.getBoundingClientRect();
      const col = Math.max(0, Math.min(PILE_COLUMNS - 1, Math.floor(((e.clientX - rect.left) / rect.width) * PILE_COLUMNS)));
      ctx.dropToPile(roomIdx, col);
    });
    return root;
  }

  function update() {
    const g = ctx.game;
    const cols = g.s.piles[roomIdx];
    countEl.textContent = g.pileCount(roomIdx);

    const W = pileEl.clientWidth || 1000;
    const H = pileEl.clientHeight || 600;
    const colW = W / PILE_COLUMNS;
    const bw = Math.max(22, Math.min(40, colW * 0.78));
    const bh = bw * 1.9;
    const step = Math.min(bh * 0.62, (H - bh - 8) / (PILE_MAX_HEIGHT - 1));
    pileEl.style.setProperty("--vw", bw + "px");

    const alive = new Set();
    cols.forEach((col, ci) => {
      col.forEach((id, k) => {
        alive.add(id);
        let el = els.get(id);
        const item = g.item(id);
        if (!el) {
          el = h("div", { class: "pile-item", "data-pile": id });
          el.append(vial(item));
          pileEl.append(el);
          els.set(id, el);
        }
        const x = ci * colW + (colW - bw) / 2 + jitter(id, 1) * colW * 0.7;
        const y = k * step + Math.abs(jitter(id, 2)) * step * 0.3;
        el.style.left = x + "px";
        el.style.bottom = y + "px";
        el.style.zIndex = k * 3 + ((ci * 7) % 3);
        el.style.setProperty("--rot", jitter(id, 3) * 26 + "deg");
        el.classList.toggle("top", k === col.length - 1);
      });
    });
    for (const [id, el] of els) {
      if (!alive.has(id)) { el.remove(); els.delete(id); }
    }
  }

  return {
    mount(container, r) {
      container.replaceChildren(build(r));
      requestAnimationFrame(() => {
        // 첫 배치는 애니메이션 없이
        pileEl.classList.add("no-anim");
        update();
        requestAnimationFrame(() => pileEl.classList.remove("no-anim"));
      });
    },
    update() { if (root?.isConnected) update(); },
    get room() { return roomIdx; },
  };
}
