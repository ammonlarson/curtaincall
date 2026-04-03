import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

let s3Client: S3Client | null = null;

function getS3Client(): S3Client {
  if (!s3Client) {
    s3Client = new S3Client({
      region: process.env['AWS_REGION'] ?? 'us-east-1',
    });
  }
  return s3Client;
}

function getBucketName(): string {
  const bucket = process.env['S3_BUCKET'];
  if (!bucket) {
    throw new Error('S3_BUCKET environment variable is not set');
  }
  return bucket;
}

const ALLOWED_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
];

const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

/**
 * Generate a presigned URL for uploading a show image to S3.
 */
export async function generateUploadUrl(
  showId: string,
  contentType: string
): Promise<{ uploadUrl: string; imageKey: string }> {
  if (!ALLOWED_CONTENT_TYPES.includes(contentType)) {
    throw new Error(
      `Invalid content type. Allowed: ${ALLOWED_CONTENT_TYPES.join(', ')}`
    );
  }

  const ext = contentType.split('/')[1] ?? 'jpg';
  const imageKey = `shows/${showId}/${Date.now()}.${ext}`;

  const command = new PutObjectCommand({
    Bucket: getBucketName(),
    Key: imageKey,
    ContentType: contentType,
    ContentLength: MAX_FILE_SIZE,
  });

  const uploadUrl = await getSignedUrl(getS3Client(), command, {
    expiresIn: 300, // 5 minutes
  });

  return { uploadUrl, imageKey };
}

/**
 * Generate a presigned URL for reading an image from S3.
 */
export async function generateReadUrl(imageKey: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: getBucketName(),
    Key: imageKey,
  });

  return getSignedUrl(getS3Client(), command, {
    expiresIn: 3600, // 1 hour
  });
}

/**
 * Build the full public URL for an image stored in S3.
 */
export function getPublicImageUrl(imageKey: string): string {
  const cdnDomain = process.env['CDN_DOMAIN'];
  if (cdnDomain) {
    return `https://${cdnDomain}/${imageKey}`;
  }

  const bucket = getBucketName();
  const region = process.env['AWS_REGION'] ?? 'us-east-1';
  return `https://${bucket}.s3.${region}.amazonaws.com/${imageKey}`;
}
