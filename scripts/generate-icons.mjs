/**
 * Rasterises the PWA icons from `public/icons/icon.svg`.
 *
 * A one-off developer utility: the generated PNGs are committed, so a normal
 * install, build or deploy never runs this. Re-run it only after editing the
 * SVG:
 *
 *   node scripts/generate-icons.mjs
 *
 * It borrows `sharp` from the Next.js install rather than adding a dependency
 * the application itself does not need.
 */

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import sharp from "sharp";

const root = dirname(dirname(fileURLToPath(import.meta.url)));
const iconsDir = join(root, "public", "icons");

/** Maskable icons must keep their mark inside the middle 80% safe zone. */
const MASKABLE_PADDING_RATIO = 0.1;

async function render(source, size, output) {
  await sharp(source, { density: 512 }).resize(size, size).png({ compressionLevel: 9 }).toFile(output);
  return output;
}

async function renderMaskable(source, size, output) {
  const inner = Math.round(size * (1 - MASKABLE_PADDING_RATIO * 2));
  const margin = Math.round((size - inner) / 2);

  const mark = await sharp(source, { density: 512 }).resize(inner, inner).png().toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: "#0F172A",
    },
  })
    .composite([{ input: mark, top: margin, left: margin }])
    .png({ compressionLevel: 9 })
    .toFile(output);

  return output;
}

const source = join(iconsDir, "icon.svg");
await mkdir(iconsDir, { recursive: true });
await readFile(source);

const written = await Promise.all([
  render(source, 192, join(iconsDir, "icon-192.png")),
  render(source, 512, join(iconsDir, "icon-512.png")),
  render(source, 180, join(iconsDir, "apple-touch-icon.png")),
  renderMaskable(source, 512, join(iconsDir, "icon-maskable-512.png")),
]);

// Next.js serves this as the browser tab icon.
await writeFile(join(root, "src", "app", "icon.svg"), await readFile(source));

process.stdout.write(`${written.join("\n")}\nsrc/app/icon.svg\n`);
