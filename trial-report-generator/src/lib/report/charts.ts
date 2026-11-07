/**
 * Ҳисобот учун графиклар — SVG яратилиб, sharp орқали PNG'га айлантирилади.
 * Кирилл матн тизим шрифтлари (DejaVu Sans) орқали кўрсатилади.
 *
 * Нативли canvas керак эмас — фақат SVG + sharp (олдиндан тайёр бинарлар).
 */

import sharp from "sharp";

const FONT = "DejaVu Sans, Arial, sans-serif";
const GREEN = "#2e7d32";
const BLUE = "#1565c0";
const GREY = "#9e9e9e";
const PALETTE = [GREEN, BLUE, "#c62828", "#6a1b9a", "#ef6c00", "#00838f"];

function esc(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

async function svgToPng(svg: string): Promise<Buffer> {
  return sharp(Buffer.from(svg)).png().toBuffer();
}

interface Layout {
  w: number;
  h: number;
  padL: number;
  padR: number;
  padT: number;
  padB: number;
}

const L: Layout = { w: 720, h: 420, padL: 60, padR: 24, padT: 48, padB: 60 };

function plotArea() {
  return {
    x0: L.padL,
    y0: L.padT,
    x1: L.w - L.padR,
    y1: L.h - L.padB,
    width: L.w - L.padL - L.padR,
    height: L.h - L.padT - L.padB,
  };
}

function yTicks(maxVal: number, count = 5): number[] {
  const step = maxVal / count;
  return Array.from({ length: count + 1 }, (_, i) => Math.round(i * step));
}

/** Устун диаграмма (масалан биологик самарадорлик %). */
export async function efficacyBar(
  days: number[],
  values: (number | null)[],
  opts: { title?: string; xlabel?: string; maxY?: number } = {},
): Promise<Buffer> {
  const title = opts.title ?? "Биологик самарадорлик, %";
  const xlabel = opts.xlabel ?? "Ҳисоб куни";
  const a = plotArea();
  const maxY = opts.maxY ?? 100;
  const n = days.length;
  const slot = a.width / n;
  const bw = slot * 0.55;

  const parts: string[] = [];
  parts.push(
    `<rect x="0" y="0" width="${L.w}" height="${L.h}" fill="#ffffff"/>`,
    `<text x="${L.w / 2}" y="28" font-family="${FONT}" font-size="18" font-weight="bold" text-anchor="middle" fill="#111">${esc(title)}</text>`,
  );
  // Y ўқи + тўрлар
  for (const t of yTicks(maxY)) {
    const y = a.y1 - (t / maxY) * a.height;
    parts.push(
      `<line x1="${a.x0}" y1="${y}" x2="${a.x1}" y2="${y}" stroke="#e0e0e0" stroke-width="1"/>`,
      `<text x="${a.x0 - 8}" y="${y + 4}" font-family="${FONT}" font-size="12" text-anchor="end" fill="#555">${t}</text>`,
    );
  }
  // Устунлар
  days.forEach((d, i) => {
    const v = values[i];
    const cx = a.x0 + slot * i + slot / 2;
    if (v != null) {
      const bh = (Math.max(0, v) / maxY) * a.height;
      const y = a.y1 - bh;
      parts.push(
        `<rect x="${cx - bw / 2}" y="${y}" width="${bw}" height="${bh}" fill="${GREEN}" rx="2"/>`,
        `<text x="${cx}" y="${y - 6}" font-family="${FONT}" font-size="12" text-anchor="middle" fill="#111">${v.toFixed(1)}</text>`,
      );
    }
    parts.push(
      `<text x="${cx}" y="${a.y1 + 20}" font-family="${FONT}" font-size="12" text-anchor="middle" fill="#333">${d}</text>`,
    );
  });
  // Ўқлар
  parts.push(
    `<line x1="${a.x0}" y1="${a.y1}" x2="${a.x1}" y2="${a.y1}" stroke="#333" stroke-width="1.5"/>`,
    `<line x1="${a.x0}" y1="${a.y0}" x2="${a.x0}" y2="${a.y1}" stroke="#333" stroke-width="1.5"/>`,
    `<text x="${(a.x0 + a.x1) / 2}" y="${L.h - 16}" font-family="${FONT}" font-size="13" text-anchor="middle" fill="#333">${esc(xlabel)}</text>`,
  );
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${L.w}" height="${L.h}" viewBox="0 0 ${L.w} ${L.h}">${parts.join("")}</svg>`;
  return svgToPng(svg);
}

/** Чизиқли динамика (назорат vs тажриба, ёки кўп вариант). */
export async function dynamicsLine(
  days: number[],
  series: { label: string; values: (number | null)[] }[],
  opts: { title?: string; xlabel?: string; ylabel?: string } = {},
): Promise<Buffer> {
  const title = opts.title ?? "Динамика";
  const xlabel = opts.xlabel ?? "Ҳисоб куни";
  const a = plotArea();
  const allVals = series.flatMap((s) => s.values).filter((v): v is number => v != null);
  const maxY = allVals.length ? Math.max(...allVals) * 1.15 : 1;
  const n = days.length;
  const xAt = (i: number) => a.x0 + (n === 1 ? a.width / 2 : (a.width / (n - 1)) * i);
  const yAt = (v: number) => a.y1 - (v / maxY) * a.height;

  const parts: string[] = [];
  parts.push(
    `<rect x="0" y="0" width="${L.w}" height="${L.h}" fill="#ffffff"/>`,
    `<text x="${L.w / 2}" y="28" font-family="${FONT}" font-size="18" font-weight="bold" text-anchor="middle" fill="#111">${esc(title)}</text>`,
  );
  for (const t of yTicks(maxY)) {
    const y = yAt(t);
    parts.push(
      `<line x1="${a.x0}" y1="${y}" x2="${a.x1}" y2="${y}" stroke="#e0e0e0" stroke-width="1"/>`,
      `<text x="${a.x0 - 8}" y="${y + 4}" font-family="${FONT}" font-size="12" text-anchor="end" fill="#555">${t}</text>`,
    );
  }
  days.forEach((d, i) => {
    parts.push(
      `<text x="${xAt(i)}" y="${a.y1 + 20}" font-family="${FONT}" font-size="12" text-anchor="middle" fill="#333">${d}</text>`,
    );
  });
  series.forEach((s, si) => {
    const color = PALETTE[si % PALETTE.length];
    const pts: string[] = [];
    s.values.forEach((v, i) => {
      if (v != null) pts.push(`${xAt(i)},${yAt(v)}`);
    });
    if (pts.length) {
      parts.push(`<polyline points="${pts.join(" ")}" fill="none" stroke="${color}" stroke-width="2.5"/>`);
      s.values.forEach((v, i) => {
        if (v != null) parts.push(`<circle cx="${xAt(i)}" cy="${yAt(v)}" r="4" fill="${color}"/>`);
      });
    }
  });
  // Легенда
  series.forEach((s, si) => {
    const color = PALETTE[si % PALETTE.length];
    const ly = L.padT + 4 + si * 18;
    const lx = a.x1 - 170;
    parts.push(
      `<rect x="${lx}" y="${ly - 9}" width="14" height="10" fill="${color}"/>`,
      `<text x="${lx + 20}" y="${ly}" font-family="${FONT}" font-size="12" fill="#333">${esc(s.label)}</text>`,
    );
  });
  parts.push(
    `<line x1="${a.x0}" y1="${a.y1}" x2="${a.x1}" y2="${a.y1}" stroke="#333" stroke-width="1.5"/>`,
    `<line x1="${a.x0}" y1="${a.y0}" x2="${a.x0}" y2="${a.y1}" stroke="#333" stroke-width="1.5"/>`,
    `<text x="${(a.x0 + a.x1) / 2}" y="${L.h - 16}" font-family="${FONT}" font-size="13" text-anchor="middle" fill="#333">${esc(xlabel)}</text>`,
  );
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${L.w}" height="${L.h}" viewBox="0 0 ${L.w} ${L.h}">${parts.join("")}</svg>`;
  return svgToPng(svg);
}

/** Ҳосилдорлик устун диаграммаси (вариантлар бўйича). */
export async function yieldBar(
  variantNames: string[],
  values: number[],
  opts: { title?: string; ylabel?: string } = {},
): Promise<Buffer> {
  const title = opts.title ?? "Ҳосилдорлик";
  const a = plotArea();
  const maxY = values.length ? Math.max(...values) * 1.2 : 1;
  const n = variantNames.length;
  const slot = a.width / n;
  const bw = slot * 0.5;
  const parts: string[] = [];
  parts.push(
    `<rect x="0" y="0" width="${L.w}" height="${L.h}" fill="#ffffff"/>`,
    `<text x="${L.w / 2}" y="28" font-family="${FONT}" font-size="18" font-weight="bold" text-anchor="middle" fill="#111">${esc(title)}</text>`,
  );
  for (const t of yTicks(maxY)) {
    const y = a.y1 - (t / maxY) * a.height;
    parts.push(
      `<line x1="${a.x0}" y1="${y}" x2="${a.x1}" y2="${y}" stroke="#e0e0e0" stroke-width="1"/>`,
      `<text x="${a.x0 - 8}" y="${y + 4}" font-family="${FONT}" font-size="12" text-anchor="end" fill="#555">${t}</text>`,
    );
  }
  variantNames.forEach((name, i) => {
    const v = values[i];
    const cx = a.x0 + slot * i + slot / 2;
    const bh = (Math.max(0, v) / maxY) * a.height;
    const y = a.y1 - bh;
    const color = i === 0 ? GREY : PALETTE[(i - 1) % PALETTE.length];
    parts.push(
      `<rect x="${cx - bw / 2}" y="${y}" width="${bw}" height="${bh}" fill="${color}" rx="2"/>`,
      `<text x="${cx}" y="${y - 6}" font-family="${FONT}" font-size="12" text-anchor="middle" fill="#111">${v.toFixed(1)}</text>`,
      `<text x="${cx}" y="${a.y1 + 18}" font-family="${FONT}" font-size="10" text-anchor="middle" fill="#333">${esc(name.length > 16 ? name.slice(0, 15) + "…" : name)}</text>`,
    );
  });
  parts.push(
    `<line x1="${a.x0}" y1="${a.y1}" x2="${a.x1}" y2="${a.y1}" stroke="#333" stroke-width="1.5"/>`,
    `<line x1="${a.x0}" y1="${a.y0}" x2="${a.x0}" y2="${a.y1}" stroke="#333" stroke-width="1.5"/>`,
  );
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${L.w}" height="${L.h}" viewBox="0 0 ${L.w} ${L.h}">${parts.join("")}</svg>`;
  return svgToPng(svg);
}
