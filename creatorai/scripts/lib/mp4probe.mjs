// Minimal pure-JS MP4 probe (an ffprobe stand-in for the demo prep scripts; no dependencies).
// Reads the moov box only: duration, video size, frame rate, video codec, and whether an audio track exists.
import { closeSync, fstatSync, openSync, readSync } from "node:fs";

function readBox(fd, pos, size) {
  const buf = Buffer.alloc(Math.min(16, size - pos));
  readSync(fd, buf, 0, buf.length, pos);
  let len = buf.readUInt32BE(0);
  const type = buf.toString("latin1", 4, 8);
  let header = 8;
  if (len === 1) { len = Number(Buffer.concat([buf]).readBigUInt64BE(8)); header = 16; }
  if (len === 0) len = size - pos;
  return { type, start: pos, header, end: pos + len };
}

function children(fd, parent, size) {
  const out = [];
  let pos = parent.start + parent.header;
  while (pos + 8 <= parent.end) {
    const b = readBox(fd, pos, size);
    if (b.end <= pos) break;
    out.push(b); pos = b.end;
  }
  return out;
}
const body = (fd, b) => { const buf = Buffer.alloc(b.end - b.start - b.header); readSync(fd, buf, 0, buf.length, b.start + b.header); return buf; };
const find = (list, t) => list.find((b) => b.type === t);

export function probeMp4(path) {
  const fd = openSync(path, "r");
  try {
    const size = fstatSync(fd).size;
    const top = [];
    for (let pos = 0; pos + 8 <= size;) { const b = readBox(fd, pos, size); if (b.end <= pos) break; top.push(b); pos = b.end; }
    const moov = find(top, "moov");
    if (!moov) throw new Error("no moov box (not a standard MP4)");
    const mv = children(fd, moov, size);
    const mvhd = body(fd, find(mv, "mvhd"));
    const mvVersion = mvhd[0];
    const timescale = mvVersion === 1 ? mvhd.readUInt32BE(20) : mvhd.readUInt32BE(12);
    const dur = mvVersion === 1 ? Number(mvhd.readBigUInt64BE(24)) : mvhd.readUInt32BE(16);
    const info = { durationSec: +(dur / timescale).toFixed(3), width: 0, height: 0, fps: 0, codec: "", hasAudio: false, bytes: size };

    for (const trak of mv.filter((b) => b.type === "trak")) {
      const tk = children(fd, trak, size);
      const mdia = find(tk, "mdia"); if (!mdia) continue;
      const md = children(fd, mdia, size);
      const handler = body(fd, find(md, "hdlr")).toString("latin1", 8, 12);
      if (handler === "soun") { info.hasAudio = true; continue; }
      if (handler !== "vide") continue;
      const tkhd = body(fd, find(tk, "tkhd"));
      const o = tkhd[0] === 1 ? 88 : 76;
      info.width = Math.round(tkhd.readUInt32BE(o) / 65536);
      info.height = Math.round(tkhd.readUInt32BE(o + 4) / 65536);
      // rotation matrix (phones): swap when rotated 90/270
      const a = tkhd.readInt32BE(o - 36), b2 = tkhd.readInt32BE(o - 32);
      if (a === 0 && Math.abs(b2) > 0) [info.width, info.height] = [info.height, info.width];
      const mdhd = body(fd, find(md, "mdhd"));
      const mdTs = mdhd[0] === 1 ? mdhd.readUInt32BE(20) : mdhd.readUInt32BE(12);
      const minf = children(fd, find(md, "minf"), size);
      const stbl = children(fd, find(minf, "stbl"), size);
      const stts = body(fd, find(stbl, "stts"));
      let samples = 0, ticks = 0;
      for (let i = 0; i < stts.readUInt32BE(4); i++) { const c = stts.readUInt32BE(8 + i * 8), d = stts.readUInt32BE(12 + i * 8); samples += c; ticks += c * d; }
      info.fps = ticks ? +((samples * mdTs) / ticks).toFixed(2) : 0;
      const stsd = body(fd, find(stbl, "stsd"));
      info.codec = stsd.toString("latin1", 12, 16); // avc1 = H.264, hvc1/hev1 = HEVC
    }
    return info;
  } finally { closeSync(fd); }
}

export const browserPlayable = (codec) => codec === "avc1" || codec === "avc3";
