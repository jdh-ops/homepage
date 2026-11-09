// 작업실: 십자로 나뉜 4구역.
import { COLORS, ZONE3_LEVEL, ZONE4_LEVEL, MAX_FLASKS, MAX_RACK } from "../config.js";
import { h, vial, locKey } from "./common.js";

function slot(ctx, loc) {
  const g = ctx.game;
  const id = g.itemAt(loc);
  const el = h("div", { class: "slot", "data-loc": locKey(loc) });
  if (id != null) el.append(vial(g.item(id)));
  ctx.decorate(el, loc);
  return el;
}

function drum(ctx, i) {
  const g = ctx.game;
  const loc = { a: "drum", i };
  const d = g.s.drums[i];
  const cap = g.drumCap;
  const body = h("div", { class: "drum-body" });
  // 칸 높이는 물통 최대 크기 기준 → 확장하면 물통이 길어짐
  body.style.setProperty("--cap", cap);
  for (let k = 0; k < d.u.length; k++) body.append(h("div", { class: "drum-seg", "--c": COLORS[d.u[k]].hex }));
  const el = h("div", { class: "drum", "data-loc": locKey(loc) },
    h("div", { class: "drum-rim" }), body,
    h("div", { class: "drum-count", text: `${d.u.length}/${cap}` }));
  ctx.decorate(el, loc);
  return el;
}

function locked(text) {
  return h("div", { class: "zone-locked" }, h("div", { class: "lock-icon", text: "🔒" }), h("div", { text }));
}

export function renderWorkshop(ctx) {
  const g = ctx.game;

  const z1 = h("section", { class: "zone z1" },
    h("h3", {}, "1구역 · 플라스크 ", h("small", { text: `${g.flaskCount}/${MAX_FLASKS}` })),
    h("div", { class: "slots" }, Array.from({ length: g.flaskCount }, (_, i) => slot(ctx, { a: "flask", i }))));

  const z2 = h("section", { class: "zone z2" },
    h("h3", {}, "2구역 · 약병 거치대 ", h("small", { text: `${g.rackCount}/${MAX_RACK}` })),
    h("div", { class: "slots" }, Array.from({ length: g.rackCount }, (_, i) => slot(ctx, { a: "rack", i }))));

  const z3 = h("section", { class: "zone z3" }, h("h3", { text: "3구역 · 큰 물통" }));
  if (g.zoneUnlocked(3)) {
    z3.append(h("div", { class: "drums" }, Array.from({ length: g.drumCount }, (_, i) => drum(ctx, i))));
  } else {
    z3.append(locked(`레벨 ${ZONE3_LEVEL}에 열려요`));
  }

  const z4 = h("section", { class: "zone z4" }, h("h3", { text: "4구역 · 마법의 분류기" }));
  if (g.zoneUnlocked(4)) z4.append(locked("분류기는 다음 단계에서 만들어요"));
  else z4.append(locked(`레벨 ${ZONE4_LEVEL}에 열려요`));

  return h("div", { class: "room workshop" }, z1, z2, z3, z4, h("div", { class: "cross-v" }), h("div", { class: "cross-h" }));
}
