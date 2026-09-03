// Hand-drawn character portraits.
import {
  roughCircle,
  roughEllipse,
  roughLine,
  variants,
} from "./vendor/drawably/dist/index.js";

const NS = "http://www.w3.org/2000/svg";

const INK = "#2a211a";
const RED = "#8c1f28";
const GOLD = "#b08327";

const L = (x1, y1, x2, y2) => (o) => roughLine(x1, y1, x2, y2, o);
const C = (cx, cy, r) => (o) => roughCircle(cx, cy, r, o);
const E = (cx, cy, rx, ry) => (o) => roughEllipse(cx, cy, rx, ry, o);

const head = E(60, 72, 22, 26);
const neck = [L(52, 97, 50, 114), L(68, 97, 70, 114)];
const shoulders = [L(16, 138, 44, 118), L(104, 138, 76, 118)];
const eyes = [L(50, 70, 55, 70), L(65, 70, 70, 70)];
const mouth = L(54, 88, 66, 88);

const PORTRAITS = {
  // Keyleth
  keyleth: [
    { c: INK, parts: [head, ...neck, ...shoulders, ...eyes, mouth] },
    {
      c: INK,
      parts: [
        L(38, 62, 28, 120),
        L(82, 62, 92, 120),
        L(48, 44, 40, 26),
        L(40, 26, 30, 32),
        L(72, 44, 80, 26),
        L(80, 26, 90, 32),
      ],
    },
    { c: GOLD, parts: [L(40, 56, 80, 56)] },
    { c: RED, parts: [C(60, 54, 3)] },
  ],

  // Vax
  vax: [
    { c: INK, parts: [head, ...neck, ...shoulders, ...eyes, mouth] },
    {
      c: INK,
      parts: [
        L(34, 80, 34, 52),
        L(34, 52, 60, 34),
        L(60, 34, 86, 52),
        L(86, 52, 86, 80),
        L(30, 132, 56, 112),
        L(90, 132, 64, 112),
      ],
    },
    {
      c: RED,
      parts: [L(40, 124, 80, 124), L(42, 129, 78, 129)],
    },
  ],

  // Vex
  vex: [
    { c: INK, parts: [head, ...neck, ...shoulders, ...eyes, mouth] },
    {
      c: INK,
      parts: [
        L(80, 54, 92, 62),
        L(92, 62, 94, 102),
        L(24, 100, 40, 96),
        L(24, 100, 28, 132),
        L(28, 132, 44, 128),
        L(40, 96, 44, 128),
        L(26, 98, 22, 84),
        L(31, 97, 27, 83),
      ],
    },
    {
      c: RED,
      parts: [C(90, 64, 3), L(36, 95, 33, 81)],
    },
  ],

  // Percy
  percy: [
    { c: INK, parts: [head, ...neck, ...shoulders, mouth] },
    {
      c: INK,
      parts: [
        C(50, 72, 7),
        C(70, 72, 7),
        L(57, 71, 63, 71),
        L(38, 52, 52, 38),
        L(52, 38, 74, 36),
        L(74, 36, 84, 50),
      ],
    },
    {
      c: RED,
      parts: [L(38, 110, 82, 110), L(40, 116, 80, 116), L(76, 114, 84, 132)],
    },
  ],

  // Grog
  grog: [
    { c: INK, parts: [E(60, 70, 26, 28), ...neck, ...eyes] },
    {
      c: INK,
      parts: [
        L(8, 138, 40, 114),
        L(112, 138, 80, 114),
        L(98, 138, 98, 30),
        L(98, 30, 116, 44),
        L(98, 58, 116, 44),
        L(50, 88, 70, 88),
      ],
    },
    {
      c: RED,
      parts: [L(52, 54, 60, 50), L(60, 50, 68, 54)],
    },
  ],

  // Pike
  pike: [
    { c: INK, parts: [E(60, 78, 18, 21), ...neck, ...shoulders, ...eyes, mouth] },
    {
      c: GOLD,
      parts: [E(60, 42, 20, 6), C(110, 74, 10), L(44, 70, 38, 96)],
    },
    {
      c: INK,
      parts: [L(100, 132, 108, 84)],
    },
  ],

  // Scanlan
  scanlan: [
    { c: INK, parts: [head, ...neck, ...shoulders, ...eyes, mouth] },
    {
      c: RED,
      parts: [L(36, 52, 84, 52), L(44, 52, 62, 26), L(62, 26, 78, 52)],
    },
    {
      c: GOLD,
      parts: [L(64, 32, 76, 20), E(94, 104, 14, 18)],
    },
    {
      c: INK,
      parts: [L(94, 86, 102, 48)],
    },
  ],

  // Trinket
  trinket: [
    {
      c: INK,
      parts: [
        E(60, 70, 26, 24),
        C(40, 48, 9),
        C(80, 48, 9),
        E(60, 84, 10, 7),
        L(50, 64, 55, 64),
        L(65, 64, 70, 64),
        L(20, 132, 34, 118),
        L(100, 132, 86, 118),
      ],
    },
    {
      c: RED,
      parts: [C(60, 80, 2.5)],
    },
  ],
};

/** Mount a hand-drawn portrait. */
export function drawPortrait(host, name, seed = Math.floor(Math.random() * 2 ** 31)) {
  const spec = PORTRAITS[name];
  if (!spec) throw new Error(`unknown portrait: ${name}`);

  host.replaceChildren();

  const svg = document.createElementNS(NS, "svg");
  svg.setAttribute("viewBox", "0 0 120 140");
  svg.classList.add("drawably-svg");

  const frames = variants(
    (o) => spec.flatMap((g) => g.parts.map((part) => ({ c: g.c, d: part(o) }))),
    { seed, roughness: 0.9, boil: 0.55 },
  );

  frames.forEach((frame, i) => {
    const g = document.createElementNS(NS, "g");
    g.classList.add("drawably-boil");
    g.setAttribute("data-i", String(i));
    for (const { c, d } of frame) {
      const path = document.createElementNS(NS, "path");
      path.setAttribute("d", d);
      path.style.stroke = c;
      g.appendChild(path);
    }
    svg.appendChild(g);
  });

  host.appendChild(svg);
}
