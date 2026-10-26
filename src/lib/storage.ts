import 'server-only';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { eq } from 'drizzle-orm';
import { db, cvFiles } from '@/db';
import { env } from './env';

/**
 * CVs go to Cloudflare R2 when it's configured, otherwise into the database.
 * The database option needs no extra account and is plenty for a site that's starting;
 * hosts like Netlify have a read-only disk, so files can't be kept there.
 */
function client() {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
  });
}

/** Store a CV privately. Returns its key. */
export async function putCv(userId: number, file: File) {
  const ext = (file.name.split('.').pop() || 'pdf').toLowerCase().replace(/[^a-z0-9]/g, '').slice(0, 5) || 'pdf';
  const key = `cv/${userId}/${Date.now()}.${ext}`;
  const body = Buffer.from(await file.arrayBuffer());
  const contentType = file.type || 'application/octet-stream';
  if (env.storageEnabled) {
    await client().send(new PutObjectCommand({ Bucket: env.R2_BUCKET, Key: key, Body: body, ContentType: contentType }));
  } else {
    await db.insert(cvFiles).values({ key, data: body, contentType, size: body.length });
  }
  return key;
}

export async function getCv(key: string): Promise<Buffer> {
  if (env.storageEnabled) {
    const res = await client().send(new GetObjectCommand({ Bucket: env.R2_BUCKET, Key: key }));
    return Buffer.from(await res.Body!.transformToByteArray());
  }
  const [row] = await db.select({ data: cvFiles.data }).from(cvFiles).where(eq(cvFiles.key, key));
  if (!row) throw new Error('CV not found');
  return Buffer.from(row.data);
}

export async function deleteCv(key: string) {
  if (env.storageEnabled) {
    await client().send(new DeleteObjectCommand({ Bucket: env.R2_BUCKET, Key: key }));
    return;
  }
  await db.delete(cvFiles).where(eq(cvFiles.key, key));
}
