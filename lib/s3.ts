import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
  ListObjectsV2Command,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

export const s3 = new S3Client({
  region: process.env.AWS_REGION!,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export const BUCKET = process.env.AWS_S3_BUCKET!;
export const PRESETS_PREFIX = "presets/";

// Generate a pre-signed URL for viewing an image (expires in 1 hour)
export async function getPresignedUrl(key: string, expiresIn = 3600) {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  return getSignedUrl(s3, command, { expiresIn });
}

// Upload a preset photo to S3
export async function uploadPresetPhoto(
  filename: string,
  body: Buffer,
  contentType: string
) {
  const key = `${PRESETS_PREFIX}${filename}`;

  await s3.send(
    new PutObjectCommand({
      Bucket: BUCKET,
      Key: key,
      Body: body,
      ContentType: contentType,
    })
  );

  return key;
}

// Delete a preset photo from S3
export async function deletePresetPhoto(key: string) {
  await s3.send(
    new DeleteObjectCommand({
      Bucket: BUCKET,
      Key: key,
    })
  );
}

// List all preset photos in S3
export async function listPresetPhotos() {
  const command = new ListObjectsV2Command({
    Bucket: BUCKET,
    Prefix: PRESETS_PREFIX,
  });

  const response = await s3.send(command);
  const objects = response.Contents || [];

  // Filter out the prefix itself and non-image files
  return objects
    .filter((obj) => {
      const key = obj.Key || "";
      return key !== PRESETS_PREFIX && /\.(jpg|jpeg|png|gif|webp)$/i.test(key);
    })
    .map((obj) => ({
      key: obj.Key!,
      name: obj.Key!.replace(PRESETS_PREFIX, "").replace(/\.[^.]+$/, ""),
      size: obj.Size || 0,
      lastModified: obj.LastModified?.toISOString() || "",
    }));
}

// Get a file from S3 as a buffer
export async function getS3Object(key: string) {
  const command = new GetObjectCommand({
    Bucket: BUCKET,
    Key: key,
  });

  const response = await s3.send(command);
  const body = await response.Body?.transformToByteArray();
  return {
    body: body ? Buffer.from(body) : Buffer.alloc(0),
    contentType: response.ContentType || "image/jpeg",
  };
}
