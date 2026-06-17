import { S3Client, PutObjectCommand, DeleteObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const R2 = new S3Client({
  region: 'auto',
  endpoint: `https://${process.env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
})

const BUCKET = process.env.R2_BUCKET_NAME!
const PUBLIC_URL = process.env.R2_PUBLIC_URL!

export type UploadFolder = 'documents' | 'progress' | 'avatars' | 'providers'

export async function uploadFile(
  file: Buffer,
  key: string,
  contentType: string,
  folder: UploadFolder = 'documents'
): Promise<{ url: string; key: string }> {
  const fullKey = `${folder}/${key}`

  await R2.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: fullKey,
      Body: file,
      ContentType: contentType,
    })
  )

  return {
    url: `${PUBLIC_URL}/${fullKey}`,
    key: fullKey,
  }
}

export async function deleteFile(key: string): Promise<void> {
  await R2.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })
  )
}

export async function getPresignedUploadUrl(
  key: string,
  contentType: string,
  folder: UploadFolder = 'documents',
  expiresIn = 3600
): Promise<{ uploadUrl: string; fileUrl: string; key: string }> {
  const fullKey = `${folder}/${key}`

  const uploadUrl = await getSignedUrl(
    R2,
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: fullKey,
      ContentType: contentType,
    }),
    { expiresIn }
  )

  return {
    uploadUrl,
    fileUrl: `${PUBLIC_URL}/${fullKey}`,
    key: fullKey,
  }
}

export async function getPresignedDownloadUrl(key: string, expiresIn = 3600): Promise<string> {
  return getSignedUrl(
    R2,
    new GetObjectCommand({
      Bucket: BUCKET,
      Key: key,
    }),
    { expiresIn }
  )
}

export function generateFileKey(houseId: string, fileName: string): string {
  const timestamp = Date.now()
  const ext = fileName.split('.').pop() ?? 'bin'
  const safe = fileName.replace(/[^a-zA-Z0-9.-]/g, '_')
  return `${houseId}/${timestamp}-${safe}`
}
