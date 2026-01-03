import { randomUUID } from "crypto";
import * as path from "path";

import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3";

import { ensureDir, pathExists, atomicWriteFile } from "@/lib/safe-fs";
import { slugify } from "@/lib/slug";
import { withBasePath } from "@/lib/base-path";

export type UploadedImage = {
  url: string;
  alt?: string;
};

export interface ImageStorageAdapter {
  uploadImage(file: File): Promise<UploadedImage>;
}

export const ALLOWED_IMAGE_MIME_TYPES: Record<string, string> = {
  "image/png": ".png",
  "image/jpeg": ".jpg",
  "image/jpg": ".jpg",
  "image/webp": ".webp",
  "image/gif": ".gif",
};

export const MAX_IMAGE_FILE_SIZE = 5 * 1024 * 1024;

class LocalImageStorage implements ImageStorageAdapter {
  private uploadDir = path.join(process.cwd(), "public", "uploads");

  async uploadImage(file: File): Promise<UploadedImage> {
    if (file.size > MAX_IMAGE_FILE_SIZE) {
      throw new Error("File exceeds 5MB limit.");
    }
    if (!ALLOWED_IMAGE_MIME_TYPES[file.type]) {
      throw new Error(`Unsupported file type: ${file.type}`);
    }

    const baseName =
      slugify(path.parse(file.name || "image").name) || randomUUID();
    const extension = ALLOWED_IMAGE_MIME_TYPES[file.type];
    let candidate = `${baseName}${extension}`;
    let counter = 1;

    await ensureDir(this.uploadDir);
    while (await pathExists(path.join(this.uploadDir, candidate))) {
      candidate = `${baseName}-${counter}${extension}`;
      counter += 1;
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    await atomicWriteFile(path.join(this.uploadDir, candidate), buffer);

    return {
      url: withBasePath(`/uploads/${candidate}`),
      alt: baseName.replace(/-/g, " "),
    };
  }
}

class S3ImageStorage implements ImageStorageAdapter {
  private client: S3Client;
  private bucket: string;
  private region: string;
  private basePath: string;

  constructor() {
    const bucket = process.env.S3_BUCKET;
    const region = process.env.S3_REGION;
    if (!bucket || !region) {
      throw new Error("S3_BUCKET and S3_REGION must be provided for S3 uploads.");
    }

    this.bucket = bucket;
    this.region = region;
    this.basePath = process.env.S3_BASE_PREFIX ?? "uploads";
    this.client = new S3Client({
      region,
      credentials: process.env.S3_ACCESS_KEY_ID
        ? {
            accessKeyId: process.env.S3_ACCESS_KEY_ID,
            secretAccessKey: process.env.S3_SECRET_ACCESS_KEY ?? "",
          }
        : undefined,
    });
  }

  async uploadImage(file: File): Promise<UploadedImage> {
    if (file.size > MAX_IMAGE_FILE_SIZE) {
      throw new Error("File exceeds 5MB limit.");
    }
    if (!ALLOWED_IMAGE_MIME_TYPES[file.type]) {
      throw new Error(`Unsupported file type: ${file.type}`);
    }

    const extension = ALLOWED_IMAGE_MIME_TYPES[file.type];
    const key = `${this.basePath}/${randomUUID()}${extension}`;
    const body = Buffer.from(await file.arrayBuffer());

    await this.client.send(
      new PutObjectCommand({
        Bucket: this.bucket,
        Key: key,
        Body: body,
        ContentType: file.type,
        ACL: "public-read",
      }),
    );

    const endpoint =
      process.env.S3_PUBLIC_URL ??
      `https://${this.bucket}.s3.${this.region}.amazonaws.com`;

    return {
      url: `${endpoint}/${key}`,
    };
  }
}

let cachedStorage: ImageStorageAdapter | null = null;

export function getImageStorageAdapter(): ImageStorageAdapter {
  if (cachedStorage) {
    return cachedStorage;
  }

  const mode = (process.env.STORAGE_ADAPTER ?? "fs").toLowerCase();
  cachedStorage = mode === "s3" ? new S3ImageStorage() : new LocalImageStorage();
  return cachedStorage;
}

export { LocalImageStorage, S3ImageStorage };
