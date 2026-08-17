// Generates the PWA icons as PNGs, without a dependency.
//
// Chrome will not offer "Install" without at least one PNG of 192x192; the manifest carried only
// SVG, so the app could not be installed on Android at all. Nothing in this project rasterises
// images, and adding a toolchain for two flat squares would cost more than the squares are worth —
// a PNG is a handful of length-prefixed chunks around a zlib stream, and zlib is in Node already.
//
//   node scripts/make-icons.js
//
// The mark is three ascending bars: the same figure the rates tab uses, which is what the app is
// about, and simple enough to stay legible at 48px where a letterform would turn to mud.

const fs = require("fs");
const zlib = require("zlib");
const path = require("path");

const BG = [0x0b, 0x0d, 0x15];
const ACCENT = [0x6e, 0xe7, 0xff];

const CRC_TABLE = (() => {
  const table = new Int32Array(256);
  for (let n = 0; n < 256; n += 1) {
    let c = n;
    for (let k = 0; k < 8; k += 1) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[n] = c;
  }
  return table;
})();

function crc32(buf) {
  let c = 0xffffffff;
  for (let i = 0; i < buf.length; i += 1) {
    c = CRC_TABLE[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
  }
  return (c ^ 0xffffffff) >>> 0;
}

function chunk(type, data) {
  const length = Buffer.alloc(4);
  length.writeUInt32BE(data.length, 0);
  const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(body), 0);
  return Buffer.concat([length, body, crc]);
}

// size: pixels square. safe: fraction of the square the mark may occupy — maskable icons get
// cropped to a circle by some launchers, so their mark has to sit well inside the edges.
function draw(size, safe) {
  const px = (x, y) => (y * size + x) * 3;
  const rgb = Buffer.alloc(size * size * 3);

  for (let i = 0; i < size * size; i += 1) {
    rgb[i * 3] = BG[0];
    rgb[i * 3 + 1] = BG[1];
    rgb[i * 3 + 2] = BG[2];
  }

  const box = Math.round(size * safe);
  const left = Math.round((size - box) / 2);
  const bottom = Math.round((size + box) / 2);

  const gap = Math.max(1, Math.round(box * 0.12));
  const barWidth = Math.round((box - gap * 2) / 3);
  // Ascending, like a rate moving: the shortest bar first so the shape reads left to right.
  const heights = [0.45, 0.72, 1].map((f) => Math.round(box * f));

  for (let b = 0; b < 3; b += 1) {
    const x0 = left + b * (barWidth + gap);
    const y0 = bottom - heights[b];

    for (let y = y0; y < bottom; y += 1) {
      for (let x = x0; x < x0 + barWidth; x += 1) {
        if (x < 0 || y < 0 || x >= size || y >= size) {
          continue;
        }
        const i = px(x, y);
        rgb[i] = ACCENT[0];
        rgb[i + 1] = ACCENT[1];
        rgb[i + 2] = ACCENT[2];
      }
    }
  }

  // Each scanline is prefixed with its filter byte; 0 means "store as is", which costs a little
  // size and removes every chance of getting the filter arithmetic wrong.
  const raw = Buffer.alloc(size * (size * 3 + 1));
  for (let y = 0; y < size; y += 1) {
    raw[y * (size * 3 + 1)] = 0;
    rgb.copy(raw, y * (size * 3 + 1) + 1, y * size * 3, (y + 1) * size * 3);
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; // bit depth
  ihdr[9] = 2; // truecolour
  ihdr[10] = 0; // deflate
  ihdr[11] = 0; // adaptive filtering
  ihdr[12] = 0; // no interlace

  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", zlib.deflateSync(raw, { level: 9 })),
    chunk("IEND", Buffer.alloc(0))
  ]);
}

const out = path.resolve(__dirname, "../frontend/public");
const files = [
  ["icon-192.png", draw(192, 0.62)],
  ["icon-512.png", draw(512, 0.62)],
  ["icon-maskable-512.png", draw(512, 0.44)]
];

for (const [name, buf] of files) {
  fs.writeFileSync(path.join(out, name), buf);
  console.log(name, (buf.length / 1024).toFixed(1) + " КБ", buf.readUInt32BE(16) + "x" + buf.readUInt32BE(20));
}
