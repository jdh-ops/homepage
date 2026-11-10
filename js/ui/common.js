import { COLORS, DAYS, DAYS_HANJA, UNITS_PER_BOTTLE } from "../config.js";

export const $ = (sel, root = document) => root.querySelector(sel);

export function h(tag, attrs = {}, ...children) {
  const el = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === "class") el.className = v;
    else if (k === "style") el.style.cssText = v;
    else if (k.startsWith("--")) el.style.setProperty(k, v);
    else if (k === "text") el.textContent = v;
    else if (k === "html") el.innerHTML = v;
    else el.setAttribute(k, v === true ? "" : v);
  }
  for (const c of children.flat()) if (c != null) el.append(c);
  return el;
}

export function locKey(loc) {
  if (loc.a === "shelf") return `shelf:${loc.c}:${loc.r}:${loc.d}`;
  return `${loc.a}:${loc.i}`;
}

export function parseLoc(str) {
  const p = str.split(":");
  if (p[0] === "shelf") return { a: "shelf", c: +p[1], r: +p[2], d: +p[3] };
  return { a: p[0], i: +p[1] };
}

/** 약병 / 플라스크 그림 */
export function vial(item, cls = "") {
  const flask = item.t === "f";
  const el = h("div", { class: `vial ${flask ? "flask" : "bottle"} ${cls}` });
  const glass = h("div", { class: "vial-glass" });
  for (let k = 0; k < UNITS_PER_BOTTLE; k++) {
    const c = item.u[k];
    glass.append(h("div", { class: "seg" + (c == null ? " empty" : ""), "--c": c == null ? null : COLORS[c].hex }));
  }
  el.append(h("div", { class: "vial-neck" }), glass);
  if (!flask) {
    el.append(h("div", { class: "vial-label", "--lc": COLORS[item.c].hex, text: DAYS_HANJA[item.d] }));
  }
  el.title = flask ? "플라스크" : `라벨: ${COLORS[item.c].name}-${DAYS[item.d]}`;
  return el;
}

let toastTimer = 0;
export function toast(msg) {
  const t = $("#toast");
  t.textContent = msg;
  t.classList.add("show");
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.classList.remove("show"), 2200);
}

export const delay = (ms) => new Promise((r) => setTimeout(r, ms));
