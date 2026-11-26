import crypto from 'crypto';
import fs from 'fs/promises';
import path from 'path';

const MAX = 5 * 1024 * 1024;
const TYPES: Record<string, { ext: string; magic: (b: Buffer) => boolean }> = {
  'image/jpeg': { ext: 'jpg', magic: (b) => b[0] === 0xff && b[1] === 0xd8 },
  'image/png': { ext: 'png', magic: (b) => b.subarray(0, 4).toString('hex') === '89504e47' },
  'image/webp': { ext: 'webp', magic: (b) => b.subarray(0, 4).toString() === 'RIFF' && b.subarray(8, 12).toString() === 'WEBP' },
};

export const cloudinaryConfigured = () => !!(process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET);

export type UploadResult = { ok: true; url: string } | { ok: false; error: 'type' | 'size' | 'storage' };

/** Validates type, size and file signature; stores in Cloudinary when configured, else public/uploads (local development only). */
export async function storeImage(file: File): Promise<UploadResult> {
  const kind = TYPES[file.type];
  if (!kind) return { ok: false, error: 'type' };
  if (file.size > MAX || file.size === 0) return { ok: false, error: 'size' };
  const buf = Buffer.from(await file.arrayBuffer());
  if (!kind.magic(buf)) return { ok: false, error: 'type' };
  if (cloudinaryConfigured()) {
    const ts = Math.floor(Date.now() / 1000);
    const folder = 'edluxgifts';
    const sig = crypto.createHash('sha1').update(`folder=${folder}&timestamp=${ts}${process.env.CLOUDINARY_API_SECRET}`).digest('hex');
    const fd = new FormData();
    fd.append('file', new Blob([new Uint8Array(buf)], { type: file.type }), `upload.${kind.ext}`);
    fd.append('api_key', process.env.CLOUDINARY_API_KEY!);
    fd.append('timestamp', String(ts));
    fd.append('folder', folder);
    fd.append('signature', sig);
    const r = await fetch(`https://api.cloudinary.com/v1_1/${process.env.CLOUDINARY_CLOUD_NAME}/image/upload`, { method: 'POST', body: fd });
    if (!r.ok) return { ok: false, error: 'storage' };
    const j = await r.json();
    return { ok: true, url: j.secure_url as string };
  }
  if (process.env.NODE_ENV === 'production') return { ok: false, error: 'storage' }; // serverless disks are read-only
  const name = `${Date.now()}-${crypto.randomBytes(4).toString('hex')}.${kind.ext}`;
  const dir = path.join(process.cwd(), 'public', 'uploads');
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, name), buf);
  return { ok: true, url: `/uploads/${name}` };
}
