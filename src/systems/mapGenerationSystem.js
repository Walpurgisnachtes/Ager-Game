// ─────────────────────────────────────────────
//  MapGenerationSystem
//  Seeded procedural world-map generation + Huffman/Base64 serialization.
//
//  Pipeline:
//    1. Divide MAP into NUM_BLOCKS blocks, build index array + block objects.
//    2. Build proportional area-type list (same length as index array).
//    3. Shuffle list → assign area type to each block.
//    4. Per block: generate BLOCK_SIZE² tile array from area probabilities.
//    5. Shuffle each tile array.
//    6. Merge all tile arrays into a single flat world-map array.
//
//  Serialization:  toString(worldMap) → Base64,  fromString(str) → worldMap
//  Encoding:       Huffman coding over tile IDs, packed into bytes, Base64'd.
// ─────────────────────────────────────────────

// ── Map dimensions ─────────────────────────────────────────────────────────────

export const MAP_W = 231;
export const MAP_H = 231;
export const BLOCK_SIZE = 7; // tiles per block edge
export const BLOCKS_X = MAP_W / BLOCK_SIZE; // 33
export const BLOCKS_Y = MAP_H / BLOCK_SIZE; // 33
export const NUM_BLOCKS = BLOCKS_X * BLOCKS_Y; // 1 089
export const MAP_SIZE = MAP_W * MAP_H; // 53 361

// ── Area-type configuration ────────────────────────────────────────────────────

/**
 * Area type entry shape:
 *   weight            {number}  Relative weight (integer); drives proportional count.
 *   tileProbabilities {Object}  { tileId: probability }  — values need not sum to 1,
 *                                they are normalized internally.
 *   tileConstraints   {Object}  { tileId: { min?, max? } } — reserved for future
 *                                enforcement; not used in generation yet.
 *
 * Add new entries here (or pass a custom object to generateMap) to extend the system.
 */
export const DEFAULT_AREA_TYPES = {
  plain: {
    weight: 70,
    tileProbabilities: { grass: 1.0 },
    tileConstraints: {},
  },
  forest: {
    weight: 20,
    tileProbabilities: { forest: 0.8, grass: 0.2 },
    tileConstraints: {},
  },
  stone: {
    weight: 10,
    tileProbabilities: { stone: 0.5, grass: 0.5 },
    tileConstraints: {},
  },
};

// ── Seeded PRNG (Mulberry32) ───────────────────────────────────────────────────

/**
 * Returns a seeded pseudo-random function `() => [0, 1)`.
 * Accepts a string (hashed with FNV-1a) or an unsigned integer seed.
 */
function makePrng(seed) {
  let s =
    typeof seed === "string"
      ? [...seed].reduce(
          (h, c) => (Math.imul(16777619, h) ^ c.charCodeAt(0)) >>> 0,
          0x811c9dc5,
        )
      : seed >>> 0;

  return () => {
    s += 0x6d2b79f5;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t ^= t + Math.imul(t ^ (t >>> 7), 61 | t);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ── Shared utilities ───────────────────────────────────────────────────────────

/** Fisher-Yates in-place shuffle using the seeded RNG. */
function shuffleArr(arr, rng) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = arr[i];
    arr[i] = arr[j];
    arr[j] = tmp;
  }
  return arr;
}

/**
 * Pick one key from `{ key: probability }` proportionally.
 * Values are normalized internally — they need not sum to exactly 1.
 */
function probabilisticPick(probMap, rng) {
  const entries = Object.entries(probMap);
  const total = entries.reduce((s, [, p]) => s + p, 0);
  let r = rng() * total;
  for (const [key, p] of entries) {
    r -= p;
    if (r <= 0) return key;
  }
  return entries[entries.length - 1][0];
}

// ── Map generation ─────────────────────────────────────────────────────────────

/**
 * Generate a flat world-map array of length `MAP_SIZE` (`MAP_W × MAP_H`).
 * Index formula: `tile = worldMap[y * MAP_W + x]`.
 *
 * @param {string|number} seed      - Generation seed (string or uint32).
 * @param {Object}        areaTypes - Area-type config; defaults to DEFAULT_AREA_TYPES.
 * @returns {string[]} Flat tile-ID array of length MAP_SIZE.
 */
export function generateMap(seed = 0, areaTypes = DEFAULT_AREA_TYPES) {
  const rng = makePrng(seed);

  // ── Step 1: index array + block-object array ─────────────────────────────
  const blockObjects = Array.from({ length: NUM_BLOCKS }, (_, i) => ({
    index: i,
    col: i % BLOCKS_X,
    row: Math.floor(i / BLOCKS_X),
    areaType: null, // assigned in step 3
    tiles: null, // assigned in step 4
  }));

  // ── Step 2: proportional area-type list (length = NUM_BLOCKS) ───────────
  const areaEntries = Object.entries(areaTypes);
  const totalWeight = areaEntries.reduce((s, [, { weight }]) => s + weight, 0);
  const areaList = [];
  let assigned = 0;

  areaEntries.forEach(([name, { weight }], idx) => {
    const count =
      idx === areaEntries.length - 1
        ? NUM_BLOCKS - assigned // absorb rounding remainder
        : Math.round((weight / totalWeight) * NUM_BLOCKS);
    for (let i = 0; i < count; i++) areaList.push(name);
    assigned += count;
  });

  // ── Step 3: shuffle list → assign area types ─────────────────────────────
  shuffleArr(areaList, rng);
  blockObjects.forEach((b, i) => {
    b.areaType = areaList[i];
  });

  // ── Steps 4 & 5: per-block tile array, then shuffle ──────────────────────
  for (const block of blockObjects) {
    const { tileProbabilities } = areaTypes[block.areaType];
    const tileArr = Array.from({ length: BLOCK_SIZE * BLOCK_SIZE }, () =>
      probabilisticPick(tileProbabilities, rng),
    );
    shuffleArr(tileArr, rng);
    block.tiles = tileArr;
  }

  // ── Step 6: merge block tile arrays into the flat world map ──────────────
  // Interleave correctly so index = (baseY + ty) * MAP_W + (baseX + tx).
  const worldMap = new Array(MAP_SIZE);
  for (const { col, row, tiles } of blockObjects) {
    const baseX = col * BLOCK_SIZE;
    const baseY = row * BLOCK_SIZE;
    for (let ty = 0; ty < BLOCK_SIZE; ty++) {
      for (let tx = 0; tx < BLOCK_SIZE; tx++) {
        worldMap[(baseY + ty) * MAP_W + (baseX + tx)] =
          tiles[ty * BLOCK_SIZE + tx];
      }
    }
  }

  return worldMap;
}

// ── Huffman coding internals ───────────────────────────────────────────────────

class _HNode {
  constructor(sym, freq, left = null, right = null) {
    this.sym = sym;
    this.freq = freq;
    this.left = left;
    this.right = right;
  }
}

/** Minimal binary min-heap keyed by freq. */
class _MinHeap {
  constructor() {
    this._h = [];
  }

  push(n) {
    this._h.push(n);
    this._up(this._h.length - 1);
  }

  pop() {
    const top = this._h[0];
    const last = this._h.pop();
    if (this._h.length) {
      this._h[0] = last;
      this._dn(0);
    }
    return top;
  }

  get size() {
    return this._h.length;
  }

  _up(i) {
    while (i > 0) {
      const p = (i - 1) >> 1;
      if (this._h[p].freq <= this._h[i].freq) break;
      [this._h[p], this._h[i]] = [this._h[i], this._h[p]];
      i = p;
    }
  }

  _dn(i) {
    const n = this._h.length;
    for (;;) {
      let m = i;
      const l = 2 * i + 1,
        r = 2 * i + 2;
      if (l < n && this._h[l].freq < this._h[m].freq) m = l;
      if (r < n && this._h[r].freq < this._h[m].freq) m = r;
      if (m === i) break;
      [this._h[m], this._h[i]] = [this._h[i], this._h[m]];
      i = m;
    }
  }
}

/** Build a Huffman tree from a `{ symbol: frequency }` map. */
function _buildTree(freq) {
  const heap = new _MinHeap();
  for (const [sym, f] of Object.entries(freq)) heap.push(new _HNode(sym, f));

  // Single-symbol edge case: wrap in a synthetic root so the leaf is at depth 1.
  if (heap.size === 1) {
    const only = heap.pop();
    return new _HNode(null, only.freq, only, null);
  }

  while (heap.size > 1) {
    const a = heap.pop(),
      b = heap.pop();
    heap.push(new _HNode(null, a.freq + b.freq, a, b));
  }
  return heap.pop();
}

/**
 * Walk the tree and collect `[symbol, codeLength]` pairs.
 * Code length is at least 1 (handles single-symbol trees).
 */
function _collectLengths(node, depth = 0, out = []) {
  if (node.sym !== null) {
    out.push([node.sym, Math.max(1, depth)]);
  } else {
    if (node.left) _collectLengths(node.left, depth + 1, out);
    if (node.right) _collectLengths(node.right, depth + 1, out);
  }
  return out;
}

/**
 * Build canonical Huffman codes from `[symbol, codeLength]` pairs.
 * Canonical codes are deterministic from code lengths alone — only lengths
 * need to be stored in the header for lossless reconstruction.
 *
 * @returns {{ [symbol]: bitstring }}
 */
function _canonicalCodes(symLengths) {
  // Sort: shorter codes first, ties broken lexicographically by symbol.
  const sorted = [...symLengths].sort(([sa, la], [sb, lb]) =>
    la !== lb ? la - lb : sa.localeCompare(sb),
  );
  const table = {};
  let code = 0,
    prevLen = 0;
  for (const [sym, len] of sorted) {
    code = (code << (len - prevLen)) >>> 0;
    table[sym] = code.toString(2).padStart(len, "0");
    code++;
    prevLen = len;
  }
  return table;
}

// ── Serialization ──────────────────────────────────────────────────────────────

const _enc = new TextEncoder();
const _dec = new TextDecoder();

/**
 * Compress a world-map array to a Base64 string using Huffman coding.
 *
 * Binary format (before Base64):
 *   [1 byte : N = number of unique tile symbols]
 *   [per symbol (sorted by code length, then lex):
 *     [1 byte : symbol byte length L]
 *     [L bytes: symbol UTF-8]
 *     [1 byte : canonical code length in bits]
 *   ]
 *   [4 bytes: total encoded bit count (uint32 big-endian)]
 *   [⌈bitCount/8⌉ bytes: packed encoded payload (MSB first, zero-padded)]
 *
 * @param {string[]} worldMap - Flat tile array from generateMap().
 * @returns {string} Base64-encoded compressed string.
 */
export function toString(worldMap) {
  // Build frequency table
  const freq = {};
  for (const t of worldMap) freq[t] = (freq[t] ?? 0) + 1;

  // Huffman tree → canonical code table
  const tree = _buildTree(freq);
  const symLengths = _collectLengths(tree);
  const codes = _canonicalCodes(symLengths);

  // Sort entries for a deterministic, stable header
  const sortedSyms = symLengths.sort(([sa, la], [sb, lb]) =>
    la !== lb ? la - lb : sa.localeCompare(sb),
  );

  // Encode the world map into a flat bitstring, then pack into bytes (MSB first)
  const bits = worldMap.map((t) => codes[t]).join("");
  const totalBits = bits.length;
  const dataBytes = new Uint8Array(Math.ceil(totalBits / 8));
  for (let i = 0; i < totalBits; i++) {
    if (bits[i] === "1") dataBytes[i >> 3] |= 0x80 >> (i & 7);
  }

  // Assemble header
  const headerArr = [sortedSyms.length];
  for (const [sym, len] of sortedSyms) {
    const symBytes = _enc.encode(sym);
    headerArr.push(symBytes.length, ...symBytes, len);
  }
  // totalBits as big-endian uint32
  headerArr.push(
    (totalBits >>> 24) & 0xff,
    (totalBits >>> 16) & 0xff,
    (totalBits >>> 8) & 0xff,
    totalBits & 0xff,
  );

  // Combine header + payload, then Base64-encode
  const header = new Uint8Array(headerArr);
  const combined = new Uint8Array(header.length + dataBytes.length);
  combined.set(header);
  combined.set(dataBytes, header.length);

  let bin = "";
  for (const b of combined) bin += String.fromCharCode(b);
  return btoa(bin);
}

/**
 * Decompress a Base64 string produced by toString() back to a world-map array.
 *
 * @param {string} str - Base64 string.
 * @returns {string[]} Flat tile array of length MAP_SIZE.
 */
export function fromString(str) {
  // Base64 decode → raw bytes
  const bin = atob(str);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);

  // Parse header
  let pos = 0;
  const N = buf[pos++];
  const symLengths = [];

  for (let i = 0; i < N; i++) {
    const L = buf[pos++];
    const sym = _dec.decode(buf.subarray(pos, pos + L));
    pos += L;
    const codeLen = buf[pos++];
    symLengths.push([sym, codeLen]);
  }

  // totalBits (uint32 big-endian) — use >>> 0 to keep unsigned
  const totalBits =
    ((buf[pos] << 24) |
      (buf[pos + 1] << 16) |
      (buf[pos + 2] << 8) |
      buf[pos + 3]) >>>
    0;
  pos += 4;

  // Rebuild canonical code table and build reverse map (bitstring → symbol)
  const codes = _canonicalCodes(symLengths);
  const reverse = Object.fromEntries(
    Object.entries(codes).map(([s, c]) => [c, s]),
  );
  const maxLen = Math.max(...symLengths.map(([, l]) => l));

  // Decode bitstream: maintain a sliding bit-window filled byte-by-byte
  const worldMap = [];
  let window = "";
  let bytePos = pos;
  let bitsConsumed = 0;

  while (bitsConsumed < totalBits) {
    // Refill window to at least maxLen bits
    while (window.length < maxLen && bytePos < buf.length) {
      window += buf[bytePos++].toString(2).padStart(8, "0");
    }

    // Match the shortest prefix present in the reverse table
    let matched = false;
    for (let len = 1; len <= maxLen; len++) {
      const sym = reverse[window.slice(0, len)];
      if (sym !== undefined) {
        worldMap.push(sym);
        window = window.slice(len);
        bitsConsumed += len;
        matched = true;
        break;
      }
    }
    if (!matched) break; // corrupted data guard
  }

  return worldMap;
}
