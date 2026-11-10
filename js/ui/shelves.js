// 선반: 7개 선반 한눈에 보기 + 선반 하나 크게 보기
import { COLORS, DAYS, SHELF_ROWS } from "../config.js";
import { h, vial, locKey } from "./common.js";

function overview(ctx) {
  const g = ctx.game;
  const cards = COLORS.map((col, c) => {
    const grid = h("div", { class: "mini-grid" });
    for (let r = 0; r < SHELF_ROWS; r++) {
      for (let d = 0; d < DAYS.length; d++) {
        const ok = g.cellOk(c, r, d);
        const cls = ok == null ? "" : ok ? (g.s.lockedRows[c][r] ? "done" : "ok") : "bad";
        grid.append(h("i", { class: cls }));
      }
    }
    const rowsDone = g.s.lockedRows[c].filter(Boolean).length;
    const card = h("button", { class: "shelf-card", "--sc": col.hex, "data-shelf": c },
      h("div", { class: "shelf-card-title" }, h("b", { text: `${col.name} 선반` })),
      h("div", { class: "shelf-card-sub", text: `${g.shelfCount(c)}/${SHELF_ROWS * DAYS.length}병 · 완성 ${rowsDone}행` }),
      grid);
    card.addEventListener("click", () => ctx.openShelf(c));
    return card;
  });
  return h("div", { class: "room shelves" },
    h("div", { class: "room-caption" }, h("b", { text: "선반" }), ` · 완성한 행 ${g.completedRows()}/${SHELF_ROWS * COLORS.length}`),
    h("div", { class: "shelf-cards" }, cards));
}

function zoom(ctx, c) {
  const g = ctx.game;
  const col = COLORS[c];
  const table = h("div", { class: "shelf-table", "--sc": col.hex });
  table.append(h("div", { class: "st-head st-num", text: "" }));
  DAYS.forEach((d) => table.append(h("div", { class: "st-head", text: d })));
  for (let r = 0; r < SHELF_ROWS; r++) {
    const lockedRow = g.s.lockedRows[c][r];
    table.append(h("div", { class: "st-num" + (lockedRow ? " done" : ""), text: lockedRow ? "✔" : String(r + 1) }));
    for (let d = 0; d < DAYS.length; d++) {
      const loc = { a: "shelf", c, r, d };
      const id = g.itemAt(loc);
      const ok = g.cellOk(c, r, d);
      const cell = h("div", {
        class: "st-cell" + (ok === false ? " bad" : "") + (lockedRow ? " locked" : ""),
        "data-loc": locKey(loc),
      });
      if (id != null) cell.append(vial(g.item(id)));
      ctx.decorate(cell, loc);
      table.append(cell);
    }
  }
  const back = h("button", { class: "btn", text: "← 전체 선반" });
  back.addEventListener("click", () => ctx.openShelf(null));
  return h("div", { class: "room shelf-zoom" },
    h("div", { class: "zoom-head" }, back,
      h("b", { class: "zoom-title", "--sc": col.hex, text: `${col.name} 선반` }),
      h("span", { class: "muted", text: `완성 ${g.s.lockedRows[c].filter(Boolean).length}/${SHELF_ROWS}행 · 같은 색 4칸이 채워진 약병만 올릴 수 있어요` })),
    h("div", { class: "zoom-scroll" }, table));
}

export function renderShelves(ctx, openShelf) {
  return openShelf == null ? overview(ctx) : zoom(ctx, openShelf);
}
