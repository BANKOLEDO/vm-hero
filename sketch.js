// Image-to-sketch rendering
import { mulberry32 } from "./drawably/dist/index.js";

function currentInk() {
  const v = getComputedStyle(document.documentElement)
    .getPropertyValue("--drawably-stroke")
    .trim();
  const hex = v.match(/#([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})/i);
  if (hex) return [parseInt(hex[1], 16), parseInt(hex[2], 16), parseInt(hex[3], 16)];
  const rgb = v.match(/rgba?\(([^)]+)\)/);
  if (rgb) {
    const p = rgb[1].split(",").map((s) => parseFloat(s));
    return [p[0], p[1], p[2]];
  }
  return [42, 33, 26];
}

const EXTENSIONS = ["jpg", "jpeg", "png", "webp"];
const cache = new Map();

function loadImage(name) {
  if (!cache.has(name)) {
    cache.set(
      name,
      (async () => {
        for (const ext of EXTENSIONS) {
          try {
            const res = await fetch(`art/${name}.${ext}`);
            if (!res.ok || !res.headers.get("content-type")?.startsWith("image/")) continue;
            const url = URL.createObjectURL(await res.blob());
            const img = new Image();
            await new Promise((resolve, reject) => {
              img.onload = resolve;
              img.onerror = reject;
              img.src = url;
            });
            return img;
          } catch {
            /* try the next extension */
          }
        }
        return null;
      })(),
    );
  }
  return cache.get(name);
}

// Fallback blur
function boxBlur(data, w, h, r = 3) {
  const tmp = new Float32Array(data.length);
  const pass = (src, dst) => {
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let sum = 0;
        let n = 0;
        for (let k = -r; k <= r; k++) {
          const xx = Math.min(w - 1, Math.max(0, x + k));
          sum += src[y * w + xx];
          n++;
        }
        tmp[y * w + x] = sum / n;
      }
    }
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        let sum = 0;
        let n = 0;
        for (let k = -r; k <= r; k++) {
          const yy = Math.min(h - 1, Math.max(0, y + k));
          sum += tmp[yy * w + x];
          n++;
        }
        dst[y * w + x] = sum / n;
      }
    }
  };
  const out = new Float32Array(data.length);
  pass(data, out);
  pass(out, out);
  return out;
}

function renderSketch(img, W, H, seed, opts = {}) {
  const {
    blur = 4,
    strength = 1.9,
    edgeGain = 0.65,
    style = "pencil",
    hatchSpacing = 8,
    ink = currentInk(),
  } = opts;
  const pen = style === "pen";
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  canvas.className = "sketch";
  const ctx = canvas.getContext("2d", { willReadFrequently: true });

  const rand = mulberry32(seed);
  const jx = (rand() * 2 - 1) * 2.5;
  const jy = (rand() * 2 - 1) * 2.5;
  const jrot = (rand() * 2 - 1) * 0.008;
  const jscale = 1 + (rand() * 2 - 1) * 0.006;
  const phaseA = rand() * hatchSpacing;
  const phaseB = rand() * hatchSpacing;

  ctx.translate(W / 2 + jx, H / 2 + jy);
  ctx.rotate(jrot);
  ctx.scale(jscale, jscale);
  ctx.translate(-W / 2, -H / 2);

  const scale = Math.max(W / img.naturalWidth, H / img.naturalHeight) * 1.02;
  const dw = img.naturalWidth * scale;
  const dh = img.naturalHeight * scale;
  ctx.drawImage(img, (W - dw) / 2, (H - dh) / 2, dw, dh);
  ctx.setTransform(1, 0, 0, 1, 0, 0);

  const src = ctx.getImageData(0, 0, W, H);
  const gray = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) {
    gray[i] =
      0.299 * src.data[i * 4] + 0.587 * src.data[i * 4 + 1] + 0.114 * src.data[i * 4 + 2];
  }

  const inverted = new Float32Array(W * H);
  for (let i = 0; i < W * H; i++) inverted[i] = 255 - gray[i];

  let blurred;
  const filter = `blur(${blur}px)`;
  ctx.filter = filter;
  if (ctx.filter === filter) {
    const b = document.createElement("canvas");
    b.width = W;
    b.height = H;
    const bctx = b.getContext("2d");
    const id = bctx.createImageData(W, H);
    for (let i = 0; i < W * H; i++) {
      id.data[i * 4] = id.data[i * 4 + 1] = id.data[i * 4 + 2] = inverted[i];
      id.data[i * 4 + 3] = 255;
    }
    bctx.putImageData(id, 0, 0);
    ctx.clearRect(0, 0, W, H);
    ctx.drawImage(b, 0, 0);
    const data = ctx.getImageData(0, 0, W, H).data;
    blurred = new Float32Array(W * H);
    for (let i = 0; i < W * H; i++) blurred[i] = data[i * 4];
  } else {
    blurred = boxBlur(inverted, W, H, Math.max(1, Math.round(blur)));
  }
  ctx.filter = "none";

  const out = ctx.createImageData(W, H);
  for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
      const i = y * W + x;
      const yUp = Math.max(0, y - 1);
      const yDn = Math.min(H - 1, y + 1);
      const xL = Math.max(0, x - 1);
      const xR = Math.min(W - 1, x + 1);

      const dodged = Math.min(255, (gray[i] * 256) / (256 - Math.min(254.999, blurred[i])));

      const gx =
        -gray[yUp * W + xL] +
        gray[yUp * W + xR] -
        2 * gray[i - (x > 0 ? 1 : 0)] +
        2 * gray[i + (x < W - 1 ? 1 : 0)] -
        gray[yDn * W + xL] +
        gray[yDn * W + xR];
      const gy =
        -gray[yUp * W + xL] -
        2 * gray[yUp * W + x] -
        gray[yUp * W + xR] +
        gray[yDn * W + xL] +
        2 * gray[yDn * W + x] +
        gray[yDn * W + xR];
      const edge = Math.min(255, Math.hypot(gx, gy) * edgeGain);

      let a;
      if (pen) {
        const lineA = edge < 9 ? 0 : Math.min(255, (edge - 9) * 3.2);
        const shadeA = Math.max(0, Math.min(50, (255 - dodged) * strength - 30));
        let hatchA = 0;
        if (((x + y + phaseA) % hatchSpacing) < 2.4 && gray[i] < 158) {
          hatchA = 185;
        }
        if (((x - y + phaseB) % hatchSpacing) < 2.4 && gray[i] < 86) {
          hatchA = Math.max(hatchA, 165);
        }
        a = Math.max(lineA, shadeA, hatchA);
        a = a < 12 ? 0 : a;
      } else {
        const line = Math.min(dodged, 255 - edge);
        a = (255 - line) * strength - 14;
        a = a < 10 ? 0 : Math.min(255, a);
      }

      const o = i * 4;
      out.data[o] = ink[0];
      out.data[o + 1] = ink[1];
      out.data[o + 2] = ink[2];
      out.data[o + 3] = a;
    }
  }

  ctx.clearRect(0, 0, W, H);
  ctx.putImageData(out, 0, 0);
  return canvas;
}

/** Render a portrait. */
export async function sketchPortrait(host, name, seed = Math.floor(Math.random() * 2 ** 31)) {
  const img = await loadImage(name);
  if (!img) return false;
  host.replaceChildren();
  host.appendChild(renderSketch(img, 320, 380, seed));
  return true;
}

/** Render a full-bleed hero sketch. */
export async function sketchFull(host, name, seed = Math.floor(Math.random() * 2 ** 31)) {
  const img = await loadImage(name);
  if (!img) return false;
  host.replaceChildren();
  host.appendChild(
    renderSketch(img, 2560, 1600, seed, {
      style: "pen",
      blur: 2.4,
      strength: 0.5,
      edgeGain: 0.85,
      hatchSpacing: 9,
    }),
  );
  return true;
}

/** Render the tiled hero wallpaper. */
export async function sketchPattern(host, names, seed = Math.floor(Math.random() * 2 ** 31)) {
  const imgs = (await Promise.all(names.map(loadImage))).filter(Boolean);
  if (!imgs.length) return false;

  host.replaceChildren();

  const rand = mulberry32(seed);
  const TW = 240;
  const TH = 300;
  const W = 2400;
  const H = 1500;

  const tiles = imgs.map((img) =>
    renderSketch(img, TW, TH, Math.floor(rand() * 2 ** 31), {
      style: "pen",
      blur: 1.6,
      strength: 0.5,
      edgeGain: 0.85,
      hatchSpacing: 9,
    }),
  );

  const sheet = document.createElement("canvas");
  sheet.width = W;
  sheet.height = H;
  sheet.className = "sketch";
  const ctx = sheet.getContext("2d");

  const cols = Math.ceil(W / TW) + 1;
  const rows = Math.ceil(H / TH) + 1;
  for (let r = 0; r < rows; r++) {
    const stagger = (r % 2) * (TW / 2);
    for (let c = 0; c < cols; c++) {
      const tile = tiles[Math.floor(rand() * tiles.length)];
      const rot = (rand() * 2 - 1) * 0.09;
      const s = 1 + (rand() * 2 - 1) * 0.04;
      const x = c * TW + stagger + TW / 2 + (rand() * 2 - 1) * 6;
      const y = r * TH + TH / 2 + (rand() * 2 - 1) * 6;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(rot);
      ctx.scale(s, s);
      ctx.drawImage(tile, -TW / 2, -TH / 2);
      ctx.restore();
    }
  }

  host.appendChild(sheet);
  return true;
}

