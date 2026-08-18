// A QR code, drawn without a library.
//
// An extension may not load code from anywhere else, and the alternative —
// asking a server to draw the picture — would send the pairing code out to a
// third party on every attempt. What has to be encoded is one short link, so
// only what that needs is here: byte mode, error correction level L, and
// versions 1 to 9 (up to 230 characters).

/// Arithmetic in GF(256), the field Reed–Solomon codes are computed in.
const SN_QR_EXP = new Uint8Array(512);
const SN_QR_LOG = new Uint8Array(256);
(() => {
  let x = 1;
  for (let i = 0; i < 255; i += 1) {
    SN_QR_EXP[i] = x;
    SN_QR_LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d; // the field's defining polynomial
  }
  for (let i = 255; i < 512; i += 1) SN_QR_EXP[i] = SN_QR_EXP[i - 255];
})();

const snQrMul = (a, b) => (a && b ? SN_QR_EXP[SN_QR_LOG[a] + SN_QR_LOG[b]] : 0);

/// Per version, at error correction L: [total data codewords, error correction
/// codewords per block, number of blocks]. Blocks are all one size up to
/// version 9, which is why the table can be this short.
const SN_QR_VERSIONS = [
  null,
  [19, 7, 1], [34, 10, 1], [55, 15, 1], [80, 20, 1], [108, 26, 1],
  [136, 18, 2], [156, 20, 2], [194, 24, 2], [232, 30, 2],
];

/// Centres of the alignment squares, which exist from version 2 onwards.
const SN_QR_ALIGN = [
  [], [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46],
];

function snQrGenerator(degree) {
  let poly = [1];
  for (let i = 0; i < degree; i += 1) {
    const next = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j += 1) {
      next[j] ^= poly[j];
      next[j + 1] ^= snQrMul(poly[j], SN_QR_EXP[i]);
    }
    poly = next;
  }
  return poly;
}

/// The check bytes appended to one block of data.
function snQrRemainder(data, count) {
  const generator = snQrGenerator(count);
  const rest = new Uint8Array(count);
  for (const byte of data) {
    const factor = byte ^ rest[0];
    rest.copyWithin(0, 1);
    rest[count - 1] = 0;
    if (factor) for (let i = 0; i < count; i += 1) rest[i] ^= snQrMul(generator[i + 1], factor);
  }
  return rest;
}

/// Format information: five bits saying "level L, mask n", protected by a
/// BCH code and scrambled so that an all-zero pattern cannot occur.
function snQrFormat(mask) {
  const value = 0b01000 | mask; // 01 = level L
  let bits = value << 10;
  for (let i = 4; i >= 0; i -= 1) if (bits & (1 << (i + 10))) bits ^= 0x537 << i;
  return ((value << 10) | bits) ^ 0x5412;
}

const SN_QR_MASKS = [
  (r, c) => (r + c) % 2 === 0,
  (r) => r % 2 === 0,
  (r, c) => c % 3 === 0,
  (r, c) => (r + c) % 3 === 0,
  (r, c) => (Math.floor(r / 2) + Math.floor(c / 3)) % 2 === 0,
  (r, c) => ((r * c) % 2) + ((r * c) % 3) === 0,
  (r, c) => (((r * c) % 2) + ((r * c) % 3)) % 2 === 0,
  (r, c) => (((r + c) % 2) + ((r * c) % 3)) % 2 === 0,
];

/// How badly a masked grid would read: long same-coloured runs, square blocks,
/// anything resembling a finder pattern, and an unbalanced light-to-dark ratio.
function snQrPenalty(grid) {
  const size = grid.length;
  let score = 0;
  const finder = [true, false, true, true, true, false, true, false, false, false, false];
  const lines = [];
  for (let i = 0; i < size; i += 1) {
    lines.push(grid[i]);
    lines.push(grid.map((row) => row[i]));
  }
  for (const line of lines) {
    let run = 1;
    for (let i = 1; i < size; i += 1) {
      if (line[i] === line[i - 1]) {
        run += 1;
        if (run === 5) score += 3;
        else if (run > 5) score += 1;
      } else run = 1;
    }
    for (let i = 0; i + 11 <= size; i += 1) {
      const window = line.slice(i, i + 11);
      if (finder.every((value, index) => value === window[index])) score += 40;
      if (finder.every((value, index) => value === window[10 - index])) score += 40;
    }
  }
  for (let r = 0; r + 1 < size; r += 1) {
    for (let c = 0; c + 1 < size; c += 1) {
      const value = grid[r][c];
      if (value === grid[r][c + 1] && value === grid[r + 1][c] && value === grid[r + 1][c + 1]) score += 3;
    }
  }
  const dark = grid.flat().filter(Boolean).length;
  score += Math.floor(Math.abs((dark * 100) / (size * size) - 50) / 5) * 10;
  return score;
}

/// The finished grid: true is a dark module. Throws only if the text is longer
/// than version 9 can hold, which the pairing link never is.
function snQrMatrix(text) {
  const bytes = new TextEncoder().encode(text);
  const version = SN_QR_VERSIONS.findIndex(
    (entry, index) => index > 0 && bytes.length + 2 <= entry[0],
  );
  if (version < 1) throw new Error('Too much text for a small QR code');
  const [dataCount, eccCount, blocks] = SN_QR_VERSIONS[version];

  // Mode indicator, length, the text itself, then padding to fill the version.
  const bits = [];
  const push = (value, width) => {
    for (let i = width - 1; i >= 0; i -= 1) bits.push((value >> i) & 1);
  };
  push(0b0100, 4);
  push(bytes.length, 8);
  for (const byte of bytes) push(byte, 8);
  push(0, Math.min(4, dataCount * 8 - bits.length));
  while (bits.length % 8) bits.push(0);
  const data = [];
  for (let i = 0; i < bits.length; i += 8) {
    data.push(bits.slice(i, i + 8).reduce((value, bit) => (value << 1) | bit, 0));
  }
  for (let i = 0; data.length < dataCount; i += 1) data.push(i % 2 ? 0x11 : 0xec);

  // Split into blocks, protect each, then interleave: a scratch on the printed
  // code then damages a little of every block rather than all of one.
  const perBlock = dataCount / blocks;
  const dataBlocks = [];
  const eccBlocks = [];
  for (let i = 0; i < blocks; i += 1) {
    const block = data.slice(i * perBlock, (i + 1) * perBlock);
    dataBlocks.push(block);
    eccBlocks.push(snQrRemainder(block, eccCount));
  }
  const stream = [];
  for (let i = 0; i < perBlock; i += 1) for (const block of dataBlocks) stream.push(block[i]);
  for (let i = 0; i < eccCount; i += 1) for (const block of eccBlocks) stream.push(block[i]);

  const size = 17 + version * 4;
  const grid = Array.from({ length: size }, () => new Array(size).fill(false));
  const fixed = Array.from({ length: size }, () => new Array(size).fill(false));
  const set = (r, c, value) => {
    if (r < 0 || c < 0 || r >= size || c >= size) return;
    grid[r][c] = value;
    fixed[r][c] = true;
  };

  for (const [top, left] of [[0, 0], [0, size - 7], [size - 7, 0]]) {
    for (let r = -1; r <= 7; r += 1) {
      for (let c = -1; c <= 7; c += 1) {
        const edge = r === 0 || r === 6 || c === 0 || c === 6;
        const core = r >= 2 && r <= 4 && c >= 2 && c <= 4;
        const inside = r >= 0 && r <= 6 && c >= 0 && c <= 6;
        set(top + r, left + c, inside && (edge || core));
      }
    }
  }
  for (let i = 8; i < size - 8; i += 1) {
    set(6, i, i % 2 === 0);
    set(i, 6, i % 2 === 0);
  }
  for (const r of SN_QR_ALIGN[version]) {
    for (const c of SN_QR_ALIGN[version]) {
      // Every centre is used except the three that would land on a finder.
      const corner = (r < 8 && c < 8) || (r < 8 && c > size - 9) || (r > size - 9 && c < 8);
      if (corner) continue;
      for (let dr = -2; dr <= 2; dr += 1) {
        for (let dc = -2; dc <= 2; dc += 1) {
          set(r + dr, c + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1);
        }
      }
    }
  }
  set(size - 8, 8, true); // the module that is always dark
  // From version 7 the size is no longer obvious from the picture alone, so it
  // is written out twice, next to the lower-left and upper-right finders.
  if (version >= 7) {
    let remainder = version << 12;
    for (let i = 5; i >= 0; i -= 1) if (remainder & (1 << (i + 12))) remainder ^= 0x1f25 << i;
    const info = (version << 12) | remainder;
    for (let i = 0; i < 18; i += 1) {
      const on = ((info >> i) & 1) === 1;
      set(size - 11 + (i % 3), Math.floor(i / 3), on);
      set(Math.floor(i / 3), size - 11 + (i % 3), on);
    }
  }
  for (let i = 0; i < 9; i += 1) {
    if (!fixed[8][i]) set(8, i, false);
    if (!fixed[i][8]) set(i, 8, false);
  }
  for (let i = 0; i < 8; i += 1) {
    if (!fixed[8][size - 1 - i]) set(8, size - 1 - i, false);
    if (!fixed[size - 1 - i][8]) set(size - 1 - i, 8, false);
  }

  // The data snakes up and down in pairs of columns, right to left.
  let index = 0;
  let upwards = true;
  for (let right = size - 1; right > 0; right -= 2) {
    if (right === 6) right -= 1; // the timing column is not data
    for (let step = 0; step < size; step += 1) {
      const row = upwards ? size - 1 - step : step;
      for (const col of [right, right - 1]) {
        if (fixed[row][col]) continue;
        const bit = index < stream.length * 8 ? (stream[index >> 3] >> (7 - (index & 7))) & 1 : 0;
        grid[row][col] = bit === 1;
        index += 1;
      }
    }
    upwards = !upwards;
  }

  let best = null;
  for (let mask = 0; mask < 8; mask += 1) {
    const candidate = grid.map((row, r) =>
      row.map((value, c) => (fixed[r][c] ? value : value !== SN_QR_MASKS[mask](r, c))),
    );
    const format = snQrFormat(mask);
    const bit = (position) => ((format >> position) & 1) === 1;
    for (let i = 0; i <= 5; i += 1) candidate[8][i] = bit(14 - i);
    candidate[8][7] = bit(8);
    candidate[8][8] = bit(7);
    candidate[7][8] = bit(6);
    for (let i = 0; i <= 5; i += 1) candidate[i][8] = bit(i);
    // The second copy runs the other way about: the top seven bits go up the
    // bottom-left column — the module below them is the one that is always
    // dark — and the low eight run left to right along the top right.
    for (let i = 0; i <= 6; i += 1) candidate[size - 1 - i][8] = bit(14 - i);
    for (let i = 0; i <= 7; i += 1) candidate[8][size - 8 + i] = bit(7 - i);
    const score = snQrPenalty(candidate);
    if (!best || score < best.score) best = { score, grid: candidate };
  }
  return best.grid;
}

/// One path for every dark module, which keeps the picture crisp at any size
/// and small enough to drop straight into the page.
function snQrSvg(text, { quiet = 3 } = {}) {
  const grid = snQrMatrix(text);
  const size = grid.length + quiet * 2;
  let path = '';
  grid.forEach((row, r) => {
    row.forEach((dark, c) => {
      if (dark) path += `M${c + quiet} ${r + quiet}h1v1h-1z`;
    });
  });
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${size} ${size}" shape-rendering="crispEdges">` +
    `<rect width="${size}" height="${size}" fill="#ffffff"/>` +
    `<path d="${path}" fill="#101a16"/></svg>`
  );
}
