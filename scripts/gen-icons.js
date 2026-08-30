// Generate simple PNG icons for the PWA using pure Node.js
// Creates minimal valid PNG files with a green circle on dark background

const fs = require('fs');
const zlib = require('zlib');

function createPNG(size) {
  // Create raw pixel data (RGBA)
  const pixels = Buffer.alloc(size * size * 4);
  const cx = size / 2;
  const cy = size / 2;
  const radius = size * 0.35;
  const innerRadius = size * 0.15;

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const idx = (y * size + x) * 4;
      const dx = x - cx;
      const dy = y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist <= radius) {
        // Green circle (emerald)
        pixels[idx] = 16;     // R
        pixels[idx + 1] = 185; // G
        pixels[idx + 2] = 129; // B
        pixels[idx + 3] = 255; // A

        // Cut out inner circle for "N" shape effect
        if (dist <= innerRadius) {
          pixels[idx] = 9;
          pixels[idx + 1] = 9;
          pixels[idx + 2] = 11;
          pixels[idx + 3] = 255;
        }

        // Add "N" letter approximation - two vertical lines and a diagonal
        const nx = (x - cx) / radius;
        const ny = (y - cy) / radius;
        const thickness = 0.12;

        // Left vertical bar of N
        if (Math.abs(nx + 0.45) < thickness * 0.5 && Math.abs(ny) < 0.55) {
          pixels[idx] = 255; pixels[idx + 1] = 255; pixels[idx + 2] = 255; pixels[idx + 3] = 255;
        }
        // Right vertical bar of N
        if (Math.abs(nx - 0.45) < thickness * 0.5 && Math.abs(ny) < 0.55) {
          pixels[idx] = 255; pixels[idx + 1] = 255; pixels[idx + 2] = 255; pixels[idx + 3] = 255;
        }
        // Diagonal of N
        const diagDist = Math.abs(nx - ny * 0.9);
        if (diagDist < thickness * 0.7 && Math.abs(ny) < 0.55) {
          pixels[idx] = 255; pixels[idx + 1] = 255; pixels[idx + 2] = 255; pixels[idx + 3] = 255;
        }
      } else {
        // Dark background
        pixels[idx] = 9;
        pixels[idx + 1] = 9;
        pixels[idx + 2] = 11;
        pixels[idx + 3] = 255;
      }
    }
  }

  // Build PNG file
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0); // width
  ihdrData.writeUInt32BE(size, 4); // height
  ihdrData[8] = 8;  // bit depth
  ihdrData[9] = 6;  // color type (RGBA)
  ihdrData[10] = 0; // compression
  ihdrData[11] = 0; // filter
  ihdrData[12] = 0; // interlace
  const ihdr = makeChunk('IHDR', ihdrData);

  // IDAT chunk - raw pixel data with filter bytes
  const rawData = Buffer.alloc(size * (size * 4 + 1));
  for (let y = 0; y < size; y++) {
    rawData[y * (size * 4 + 1)] = 0; // filter: None
    pixels.copy(rawData, y * (size * 4 + 1) + 1, y * size * 4, (y + 1) * size * 4);
  }
  const compressed = zlib.deflateSync(rawData);
  const idat = makeChunk('IDAT', compressed);

  // IEND chunk
  const iend = makeChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdr, idat, iend]);
}

function makeChunk(type, data) {
  const len = Buffer.alloc(4);
  len.writeUInt32BE(data.length, 0);
  const typeBuffer = Buffer.from(type, 'ascii');
  const crcData = Buffer.concat([typeBuffer, data]);
  const crc = Buffer.alloc(4);
  crc.writeUInt32BE(crc32(crcData), 0);
  return Buffer.concat([len, typeBuffer, data, crc]);
}

function crc32(buf) {
  let crc = 0xffffffff;
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i];
    for (let j = 0; j < 8; j++) {
      crc = (crc >>> 1) ^ (crc & 1 ? 0xedb88320 : 0);
    }
  }
  return (crc ^ 0xffffffff) >>> 0;
}

// Generate icons
fs.writeFileSync('public/nexus-icon-192.png', createPNG(192));
fs.writeFileSync('public/nexus-icon-512.png', createPNG(512));
console.log('Icons generated!');
