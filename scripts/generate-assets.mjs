// Pre-renders sample garments, sample result photos and PWA icons.
//   npm run assets            -> writes into /public
//   npm run assets -- --sheet -> also writes a contact sheet for quick review
//
// To use REAL photos for the demo, just replace the JPGs in
// public/samples/garments and public/samples/results (same file names).
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { backgroundSvg, buildScene, flatLayDoc, OUT_H, OUT_W, poseForVariant } from "../src/lib/art/scene.ts";
import { SAMPLE_GARMENTS, SAMPLE_RESULT_COUNT } from "../src/lib/art/samples.ts";
import { MARKET_IMAGE_COUNT, SEED_PRODUCTS, SEED_SHOPS } from "../src/lib/art/market-seed.ts";
import { readdir } from "node:fs/promises";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const pub = path.join(root, "public");
const wantSheet = process.argv.includes("--sheet");

const toJpg = (svg, out, w = 900) =>
  sharp(Buffer.from(svg), { density: 72 }).resize({ width: w }).jpeg({ quality: 82, mozjpeg: true }).toFile(out);

await mkdir(path.join(pub, "samples/garments"), { recursive: true });
await mkdir(path.join(pub, "samples/results"), { recursive: true });
await mkdir(path.join(pub, "icons"), { recursive: true });
await mkdir(path.join(pub, "samples/backgrounds"), { recursive: true });

// background preset thumbnails for the "Choose the look" screen
for (const bg of ["white", "studio", "wedding", "street", "festive", "shop"]) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${OUT_W}" height="${OUT_H}" viewBox="0 0 ${OUT_W} ${OUT_H}"><defs>${
    buildScene({ garment: "saree", gender: "woman", age: "adult", skin: "wheatish", pose: "standing", background: bg }).backgroundDoc.match(/<defs>([\s\S]*?)<\/defs>/)[1]
  }</defs>${backgroundSvg(bg)}</svg>`;
  await toJpg(svg, path.join(pub, "samples/backgrounds", `${bg}.jpg`), 320);
}

const sheetFiles = [];
for (const s of SAMPLE_GARMENTS) {
  const kid = s.look.gender === "girl" || s.look.gender === "boy";
  const g = path.join(pub, "samples/garments", `${s.id}.jpg`);
  await toJpg(flatLayDoc(s.garment, s.fabric, kid), g, 600);
  sheetFiles.push(g);
  for (let n = 0; n < SAMPLE_RESULT_COUNT; n++) {
    const scene = buildScene({
      garment: s.garment,
      ...s.look,
      pose: poseForVariant(s.look.pose, n),
      variant: n,
      fabric: s.fabric,
    });
    const out = path.join(pub, "samples/results", `${s.id}-${n + 1}.jpg`);
    await toJpg(scene.fullDoc, out);
    sheetFiles.push(out);
  }
  console.log("rendered", s.id);
}

/* ------------------------------------------------------- marketplace */
await mkdir(path.join(pub, "samples/market"), { recursive: true });
await mkdir(path.join(pub, "samples/shops"), { recursive: true });
const only = process.argv.find((a) => a.startsWith("--only="))?.slice(7);
for (const p of SEED_PRODUCTS) {
  if (only && only !== "market") break;
  const kid = p.look.gender === "girl" || p.look.gender === "boy";
  await toJpg(flatLayDoc(p.garment, p.fabric, kid), path.join(pub, "samples/market", `${p.id}-before.jpg`), 600);
  for (let n = 0; n < MARKET_IMAGE_COUNT; n++) {
    const scene = buildScene({ garment: p.garment, ...p.look, pose: poseForVariant(p.look.pose, n), variant: n, fabric: p.fabric });
    await toJpg(scene.fullDoc, path.join(pub, "samples/market", `${p.id}-${n + 1}.jpg`), 720);
  }
  console.log("market", p.id);
}
for (const shop of SEED_SHOPS) {
  const initials = shop.name.split(/\s+/).map((w) => w[0]).slice(0, 2).join("");
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 128 128"><rect width="128" height="128" rx="32" fill="${shop.color}"/><circle cx="104" cy="24" r="30" fill="#fff" fill-opacity=".14"/><text x="64" y="80" font-family="Arial, sans-serif" font-weight="700" font-size="48" fill="#fff" text-anchor="middle">${initials}</text></svg>`;
  await sharp(Buffer.from(svg)).resize(128).png().toFile(path.join(pub, "samples/shops", `${shop.id}.png`));
}

/* blur placeholders: just a 2x2 colour grid per photo (~30 bytes); SmartImage turns it
   into a blurred SVG. Keeps the JS bundle tiny compared with base64 thumbnails. */
const blur = {};
for (const dir of ["samples/market", "samples/results"]) {
  for (const f of (await readdir(path.join(pub, dir))).filter((x) => x.endsWith(".jpg"))) {
    const { data } = await sharp(path.join(pub, dir, f)).resize(2, 2, { fit: "cover" }).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    blur[`/${dir}/${f}`] = Array.from({ length: 4 }, (_, i) => Array.from(data.subarray(i * 3, i * 3 + 3), (v) => v.toString(16).padStart(2, "0")).join("")).join("");
  }
}
await writeFile(path.join(root, "src/lib/art/blur-map.json"), JSON.stringify(blur));
console.log("blur map", Object.keys(blur).length);

/* ------------------------------------------------------------ PWA icons */
const icon = (pad) => `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512">
  <rect width="512" height="512" rx="${pad ? 0 : 112}" fill="#E8871E"/>
  <g transform="translate(256 262) scale(${pad ? 0.72 : 0.9}) translate(-256 -262)">
    <rect x="96" y="168" width="320" height="224" rx="44" fill="#FFF8EE"/>
    <path d="M196 168l22-40h76l22 40z" fill="#FFF8EE"/>
    <circle cx="256" cy="280" r="74" fill="#1E1B4B"/>
    <circle cx="256" cy="280" r="46" fill="#E8871E"/>
    <path d="M362 96l10 26 26 10-26 10-10 26-10-26-26-10 26-10z" fill="#1E1B4B"/>
  </g></svg>`;
await sharp(Buffer.from(icon(false))).resize(192).png().toFile(path.join(pub, "icons/icon-192.png"));
await sharp(Buffer.from(icon(false))).resize(512).png().toFile(path.join(pub, "icons/icon-512.png"));
await sharp(Buffer.from(icon(true))).resize(512).png().toFile(path.join(pub, "icons/maskable-512.png"));
await sharp(Buffer.from(icon(true))).resize(180).png().toFile(path.join(pub, "icons/apple-touch-icon.png"));
await writeFile(path.join(pub, "icons/logo.svg"), icon(false));
console.log("icons done");

if (wantSheet) {
  const tiles = await Promise.all(sheetFiles.map((f) => sharp(f).resize(180, 225, { fit: "cover" }).toBuffer()));
  const cols = 5;
  const rows = Math.ceil(tiles.length / cols);
  const sheet = sharp({ create: { width: cols * 180, height: rows * 225, channels: 3, background: "#fff" } }).composite(
    tiles.map((input, i) => ({ input, left: (i % cols) * 180, top: Math.floor(i / cols) * 225 })),
  );
  const out = process.env.SHEET_OUT || path.join(root, "contact-sheet.jpg");
  await sheet.jpeg().toFile(out);
  console.log("sheet:", out);
}
