import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import * as path from "path";

export async function ensureDir(dirPath: string) {
  await fs.mkdir(dirPath, { recursive: true });
}

export async function pathExists(targetPath: string) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function atomicWriteFile(
  targetPath: string,
  data: string | Buffer,
) {
  const dir = path.dirname(targetPath);
  await ensureDir(dir);
  const tempPath = path.join(
    dir,
    `.tmp-${path.basename(targetPath)}-${randomUUID()}`,
  );

  await fs.writeFile(tempPath, data);
  await fs.rename(tempPath, targetPath);
}

export async function atomicWriteJson(targetPath: string, payload: unknown) {
  const formatted =
    typeof payload === "string"
      ? payload
      : JSON.stringify(payload, null, 2) + "\n";
  await atomicWriteFile(targetPath, formatted);
}

export async function safeReadJson<T>(
  targetPath: string,
  fallback: T,
): Promise<T> {
  try {
    const data = await fs.readFile(targetPath, "utf8");
    return JSON.parse(data) as T;
  } catch (error) {
    if (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code: string }).code === "ENOENT"
    ) {
      return fallback;
    }
    throw error;
  }
}
