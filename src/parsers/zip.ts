import JSZip from 'jszip';

/**
 * Zip access that does NOT load the whole archive into memory.
 *
 * Instagram exports with media can be several GB — far more than a phone browser can hold.
 * We read the zip's central directory from the end of the Blob, then slice + inflate only the
 * entries we need (a few MB of JSON/text) with the native DecompressionStream.
 * Falls back to JSZip (whole-file) when DecompressionStream('deflate-raw') isn't available.
 */
export interface ZipEntry {
  path: string;
  size: number;
  readBytes(): Promise<Uint8Array>;
  readText(): Promise<string>;
}

const utf8 = new TextDecoder('utf-8');

export async function openZip(blob: Blob): Promise<ZipEntry[]> {
  if (supportsDeflateRaw()) {
    try {
      return await openLazy(blob);
    } catch {
      // fall through to JSZip (e.g. unusual zip layout)
    }
  }
  return openWithJSZip(blob);
}

export async function isZip(blob: Blob): Promise<boolean> {
  if (blob.size < 4) return false;
  const head = new Uint8Array(await blob.slice(0, 4).arrayBuffer());
  return head[0] === 0x50 && head[1] === 0x4b && (head[2] === 0x03 || head[2] === 0x05) && (head[3] === 0x04 || head[3] === 0x06);
}

let deflateRawSupport: boolean | null = null;
export function supportsDeflateRaw(): boolean {
  if (deflateRawSupport !== null) return deflateRawSupport;
  try {
    // eslint-disable-next-line no-new
    new DecompressionStream('deflate-raw' as CompressionFormat);
    deflateRawSupport = true;
  } catch {
    deflateRawSupport = false;
  }
  return deflateRawSupport;
}

export async function openWithJSZip(blob: Blob): Promise<ZipEntry[]> {
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const out: ZipEntry[] = [];
  zip.forEach((path, file) => {
    if (file.dir) return;
    const size = (file as unknown as { _data?: { uncompressedSize?: number } })._data?.uncompressedSize ?? 0;
    out.push({
      path,
      size,
      readBytes: () => file.async('uint8array'),
      readText: () => file.async('string'),
    });
  });
  return out;
}

// ------------------------------------------------------------------------------------------------

async function bytes(blob: Blob, start: number, end: number): Promise<DataView> {
  const buf = await blob.slice(start, end).arrayBuffer();
  return new DataView(buf);
}

async function openLazy(blob: Blob): Promise<ZipEntry[]> {
  const size = blob.size;
  const tailLen = Math.min(size, 65_557 + 22);
  const tail = await bytes(blob, size - tailLen, size);
  let eocd = -1;
  for (let i = tail.byteLength - 22; i >= 0; i--) {
    if (tail.getUint32(i, true) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('Not a zip file (no end of central directory)');

  let entries = tail.getUint16(eocd + 10, true);
  let cdSize = tail.getUint32(eocd + 12, true);
  let cdOffset = tail.getUint32(eocd + 16, true);

  if (entries === 0xffff || cdSize === 0xffffffff || cdOffset === 0xffffffff) {
    // ZIP64: locator sits 20 bytes before the EOCD record.
    const locPos = eocd - 20;
    if (locPos < 0 || tail.getUint32(locPos, true) !== 0x07064b50) throw new Error('Bad zip64 locator');
    const z64Offset = Number(tail.getBigUint64(locPos + 8, true));
    const z64 = await bytes(blob, z64Offset, z64Offset + 56);
    if (z64.getUint32(0, true) !== 0x06064b50) throw new Error('Bad zip64 record');
    entries = Number(z64.getBigUint64(32, true));
    cdSize = Number(z64.getBigUint64(40, true));
    cdOffset = Number(z64.getBigUint64(48, true));
  }

  const cd = await bytes(blob, cdOffset, cdOffset + cdSize);
  const out: ZipEntry[] = [];
  let p = 0;
  for (let n = 0; n < entries && p + 46 <= cd.byteLength; n++) {
    if (cd.getUint32(p, true) !== 0x02014b50) throw new Error('Bad central directory');
    const flags = cd.getUint16(p + 8, true);
    const method = cd.getUint16(p + 10, true);
    let compSize = cd.getUint32(p + 20, true);
    let uncompSize = cd.getUint32(p + 24, true);
    const nameLen = cd.getUint16(p + 28, true);
    const extraLen = cd.getUint16(p + 30, true);
    const commentLen = cd.getUint16(p + 32, true);
    let localOffset = cd.getUint32(p + 42, true);
    const nameBytes = new Uint8Array(cd.buffer, cd.byteOffset + p + 46, nameLen);
    const path = flags & 0x800 ? utf8.decode(nameBytes) : decodeLegacyName(nameBytes);

    // ZIP64 extended information extra field
    let e = p + 46 + nameLen;
    const extraEnd = e + extraLen;
    while (e + 4 <= extraEnd) {
      const id = cd.getUint16(e, true);
      const len = cd.getUint16(e + 2, true);
      if (id === 0x0001) {
        let q = e + 4;
        if (uncompSize === 0xffffffff) {
          uncompSize = Number(cd.getBigUint64(q, true));
          q += 8;
        }
        if (compSize === 0xffffffff) {
          compSize = Number(cd.getBigUint64(q, true));
          q += 8;
        }
        if (localOffset === 0xffffffff) localOffset = Number(cd.getBigUint64(q, true));
      }
      e += 4 + len;
    }
    p = extraEnd + commentLen;

    if (path.endsWith('/')) continue;
    const encrypted = (flags & 1) === 1;
    const readBytes = async (): Promise<Uint8Array> => {
      if (encrypted) throw new Error(`${path} is encrypted`);
      const lh = await bytes(blob, localOffset, localOffset + 30);
      if (lh.getUint32(0, true) !== 0x04034b50) throw new Error('Bad local header');
      const start = localOffset + 30 + lh.getUint16(26, true) + lh.getUint16(28, true);
      const data = blob.slice(start, start + compSize);
      if (method === 0) return new Uint8Array(await data.arrayBuffer());
      if (method !== 8) throw new Error(`Unsupported compression method ${method}`);
      const stream = data.stream().pipeThrough(new DecompressionStream('deflate-raw' as CompressionFormat));
      return new Uint8Array(await new Response(stream).arrayBuffer());
    };
    out.push({
      path,
      size: uncompSize,
      readBytes,
      readText: async () => utf8.decode(await readBytes()),
    });
  }
  return out;
}

function decodeLegacyName(b: Uint8Array): string {
  // Most tools write UTF-8 even without the flag; fall back to latin1 if it isn't valid UTF-8.
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(b);
  } catch {
    return Array.from(b, (c) => String.fromCharCode(c)).join('');
  }
}
