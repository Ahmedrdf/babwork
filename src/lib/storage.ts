import 'server-only';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { env } from './env';

function client() {
  return new S3Client({
    region: 'auto',
    endpoint: `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
    credentials: { accessKeyId: env.R2_ACCESS_KEY_ID, secretAccessKey: env.R2_SECRET_ACCESS_KEY },
  });
}

/** Store a CV privately in R2. Returns the object key. */
export async function putCv(userId: number, file: File) {
  const ext = (file.name.split('.').pop() || 'pdf').toLowerCase();
  const key = `cv/${userId}/${Date.now()}.${ext}`;
  const body = Buffer.from(await file.arrayBuffer());
  if (!env.storageEnabled) {
    // Local development fallback: keep CVs on disk under .uploads/
    const fs = await import('fs/promises');
    await fs.mkdir('.uploads/' + key.split('/').slice(0, -1).join('/'), { recursive: true });
    await fs.writeFile('.uploads/' + key, body);
    return key;
  }
  await client().send(new PutObjectCommand({ Bucket: env.R2_BUCKET, Key: key, Body: body, ContentType: file.type || 'application/octet-stream' }));
  return key;
}

export async function getCv(key: string): Promise<Buffer> {
  if (!env.storageEnabled) {
    const fs = await import('fs/promises');
    return fs.readFile('.uploads/' + key);
  }
  const res = await client().send(new GetObjectCommand({ Bucket: env.R2_BUCKET, Key: key }));
  return Buffer.from(await res.Body!.transformToByteArray());
}

export async function deleteCv(key: string) {
  if (!env.storageEnabled) {
    const fs = await import('fs/promises');
    await fs.rm('.uploads/' + key, { force: true });
    return;
  }
  await client().send(new DeleteObjectCommand({ Bucket: env.R2_BUCKET, Key: key }));
}
