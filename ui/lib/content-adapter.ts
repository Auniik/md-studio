import { randomUUID } from "crypto";
import { promises as fs, watch as fsWatch } from "fs";
import matter from "gray-matter";
import * as path from "path";

import { createExcerpt } from "@/lib/excerpt";
import {
  atomicWriteFile,
  atomicWriteJson,
  ensureDir,
  pathExists,
  safeReadJson,
} from "@/lib/safe-fs";
import { ensureUniqueSlug, slugify } from "@/lib/slug";

export type DocMeta = {
  title: string;
  slug: string;
  excerpt: string;
  isPublic: boolean;
  publicId: string | null;
  createdAt: string;
  updatedAt: string;
};

export type DocFull = DocMeta & {
  bodyMd: string;
};

export type SortBy = "title-asc" | "date-newest" | "date-oldest" | "updated-newest";
export type FilterBy = "all" | "public" | "private";

export interface ContentAdapter {
  list(
    query?: string,
    page?: number,
    pageSize?: number,
    sortBy?: SortBy,
    filterBy?: FilterBy,
  ): Promise<{ items: DocMeta[]; total: number }>;
  getBySlug(slug: string): Promise<DocFull | null>;
  getByPublicId(publicId: string): Promise<DocFull | null>;
  create(input: {
    title: string;
    slug?: string;
    bodyMd: string;
  }): Promise<DocMeta>;
  update(
    slug: string,
    patch: {
      title?: string;
      slug?: string;
      bodyMd?: string;
      isPublic?: boolean;
    },
  ): Promise<DocMeta>;
  remove(slug: string): Promise<void>;
  togglePublic(slug: string): Promise<DocMeta>;
  exportRaw(slug: string): Promise<{ filename: string; content: string }>;
}

const DEFAULT_CONTENT_ROOT = path.join(process.cwd(), "content");
const INDEX_PATH = path.join(process.cwd(), ".md-studio", "index.json");
const WATCH_DEBOUNCE_MS = 400;
let watcherInitialized = false;
let watcherTimer: NodeJS.Timeout | null = null;
let pollTimer: NodeJS.Timeout | null = null;
const activeWatchers: ReturnType<typeof fsWatch>[] = [];

function shouldEnableWatcher(): boolean {
  const flag = (process.env.CONTENT_WATCHER ?? "").toLowerCase();
  if (flag === "false" || flag === "0") {
    return false;
  }
  const mode = (process.env.STORAGE_ADAPTER ?? "fs").toLowerCase();
  return mode === "fs";
}

function getPollIntervalMs(): number {
  const raw = process.env.CONTENT_WATCH_POLL_MS;
  if (!raw) {
    return 0;
  }
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

function normalizeRoots(raw: string | undefined): string[] {
  if (!raw) {
    return [];
  }

  return raw
    .split(",")
    .map((entry) => entry.trim())
    .filter(Boolean)
    .map((entry) => (path.isAbsolute(entry) ? entry : path.join(process.cwd(), entry)));
}

function getScanRoots(): string[] {
  const scanRoots = normalizeRoots(process.env.SCAN_DIRS);
  if (scanRoots.length) {
    return scanRoots;
  }

  const legacyRoots = normalizeRoots(process.env.CONTENT_DIRS);
  if (legacyRoots.length) {
    return legacyRoots;
  }

  return [DEFAULT_CONTENT_ROOT];
}

function getWriteRoot(scanRoots: string[]): string {
  const explicit = normalizeRoots(process.env.WRITE_DIR);
  if (explicit.length) {
    return explicit[0];
  }
  return scanRoots[0] ?? DEFAULT_CONTENT_ROOT;
}

class LocalFsAdapter implements ContentAdapter {
  constructor() {
    if (!watcherInitialized && shouldEnableWatcher()) {
      watcherInitialized = true;
      void this.startWatcher();
    }
  }

  async list(
    query?: string,
    page = 1,
    pageSize = 20,
    sortBy: SortBy = "date-newest",
    filterBy: FilterBy = "all",
  ) {
    let index = await this.readIndex();
    const normalizedQuery = query?.trim().toLowerCase() ?? "";

    // Apply filter
    if (filterBy === "public") {
      index = index.filter((entry) => entry.isPublic);
    } else if (filterBy === "private") {
      index = index.filter((entry) => !entry.isPublic);
    }

    // Apply search
    const filtered = normalizedQuery
      ? index.filter((entry) => {
          const haystack = `${entry.title} ${entry.slug} ${entry.excerpt}`.toLowerCase();
          return haystack.includes(normalizedQuery);
        })
      : index;

    // Apply sorting
    const sorted = [...filtered].sort((a, b) => {
      switch (sortBy) {
        case "title-asc":
          return a.title.localeCompare(b.title);
        case "date-oldest":
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        case "updated-newest":
          return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
        case "date-newest":
        default:
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      }
    });

    const total = sorted.length;
    const start = Math.max(0, (page - 1) * pageSize);
    const end = start + pageSize;
    const items = sorted.slice(start, end);

    return { items, total };
  }

  async getBySlug(slug: string) {
    const location = await this.findDocLocation(slug);
    if (!location) {
      return null;
    }

    const raw = await fs.readFile(location.path, "utf8");
    const parsed = matter(raw);
    const data = this.normalizeFrontMatter(parsed.data, slug);

    const content = parsed.content.trimEnd();
    const meta = {
      ...data,
      excerpt: data.excerpt || createExcerpt(content),
    };

    return {
      ...meta,
      bodyMd: content,
    };
  }

  async getByPublicId(publicId: string) {
    const index = await this.readIndex();
    const match = index.find((entry) => entry.publicId === publicId);
    if (!match) {
      return null;
    }

    return this.getBySlug(match.slug);
  }

  async create(input: { title: string; slug?: string; bodyMd: string }) {
    const roots = this.getRoots();
    const primaryRoot = getWriteRoot(roots);
    const slug = await ensureUniqueSlug(
      input.slug,
      input.title,
      async (candidate) => {
        const existing = await Promise.all(
          roots.map((root) => pathExists(this.getDocPath(root, candidate))),
        );
        return !existing.some(Boolean);
      },
    );
    if (!slug) {
      throw new Error("Unable to derive slug from title.");
    }

    const now = new Date().toISOString();
    const docMeta: DocMeta = {
      title: input.title.trim(),
      slug,
      excerpt: createExcerpt(input.bodyMd),
      isPublic: false,
      publicId: null,
      createdAt: now,
      updatedAt: now,
    };

    await this.writeDocumentFile(primaryRoot, docMeta, input.bodyMd);
    await this.persistIndex((records) => [...records, docMeta]);

    return docMeta;
  }

  async update(
    slug: string,
    patch: {
      title?: string;
      slug?: string;
      bodyMd?: string;
      isPublic?: boolean;
    },
  ) {
    const location = await this.findDocLocation(slug);
    if (!location) {
      throw new Error(`Document "${slug}" not found.`);
    }

    const index = await this.readIndex();
    const targetIndex = index.findIndex((entry) => entry.slug === slug);
    if (targetIndex === -1) {
      throw new Error(`Document "${slug}" not found.`);
    }

    const currentMeta = index[targetIndex];
    const existing = await this.getBySlug(slug);
    if (!existing) {
      throw new Error(`Document "${slug}" content missing.`);
    }

    const desiredSlug = patch.slug ? slugify(patch.slug) : currentMeta.slug;
    if (!desiredSlug) {
      throw new Error("Updated slug cannot be empty.");
    }

    let nextSlug = desiredSlug;
    if (patch.slug && desiredSlug !== slug) {
      const roots = this.getRoots();
      nextSlug = await ensureUniqueSlug(
        desiredSlug,
        currentMeta.title,
        async (candidate) => {
          if (candidate === slug) {
            return true;
          }
          const existing = await Promise.all(
            roots.map((root) => pathExists(this.getDocPath(root, candidate))),
          );
          return !existing.some(Boolean);
        },
      );
    }

    const now = new Date().toISOString();
    const bodyMd = patch.bodyMd ?? existing.bodyMd;
    const updatedMeta: DocMeta = {
      ...currentMeta,
      title: patch.title?.trim() ?? currentMeta.title,
      slug: nextSlug,
      isPublic: patch.isPublic ?? currentMeta.isPublic,
      publicId:
        patch.isPublic === false ? null : currentMeta.publicId ?? existing.publicId,
      excerpt: createExcerpt(bodyMd),
      updatedAt: now,
    };

    if (patch.isPublic === true && !updatedMeta.publicId) {
      updatedMeta.publicId = currentMeta.publicId ?? randomUUID();
    }

    await this.writeDocumentFile(location.root, updatedMeta, bodyMd);

    if (nextSlug !== slug) {
      await fs.rm(this.getDocPath(location.root, slug), { force: true });
    }

    index[targetIndex] = updatedMeta;
    await this.writeIndex(index);

    return updatedMeta;
  }

  async remove(slug: string) {
    const index = await this.readIndex();
    const nextIndex = index.filter((entry) => entry.slug !== slug);
    if (nextIndex.length === index.length) {
      throw new Error(`Document "${slug}" not found.`);
    }

    const location = await this.findDocLocation(slug);
    if (location) {
      await fs.rm(this.getDocPath(location.root, slug), { force: true });
    }
    await this.writeIndex(nextIndex);
  }

  async togglePublic(slug: string) {
    const location = await this.findDocLocation(slug);
    if (!location) {
      throw new Error(`Document "${slug}" not found.`);
    }

    const index = await this.readIndex();
    const targetIndex = index.findIndex((entry) => entry.slug === slug);
    if (targetIndex === -1) {
      throw new Error(`Document "${slug}" not found.`);
    }

    const meta = index[targetIndex];
    const nowPublic = !meta.isPublic;
    const updatedMeta: DocMeta = {
      ...meta,
      isPublic: nowPublic,
      publicId: nowPublic ? meta.publicId ?? randomUUID() : null,
      updatedAt: new Date().toISOString(),
    };

    const document = await this.getBySlug(slug);
    if (!document) {
      throw new Error(`Document "${slug}" content missing.`);
    }

    await this.writeDocumentFile(location.root, updatedMeta, document.bodyMd);
    index[targetIndex] = updatedMeta;
    await this.writeIndex(index);

    return updatedMeta;
  }

  async exportRaw(slug: string) {
    const location = await this.findDocLocation(slug);
    if (!location) {
      throw new Error(`Document "${slug}" not found.`);
    }

    const content = await fs.readFile(location.path, "utf8");
    return { filename: `${slug}.md`, content };
  }

  private getDocPath(root: string, slug: string) {
    return path.join(root, `${slug}.md`);
  }
  private getRoots() {
    const scanRoots = getScanRoots();
    const writeRoot = getWriteRoot(scanRoots);
    const roots = new Set<string>(scanRoots);
    roots.add(writeRoot);
    return Array.from(roots);
  }

  private async findDocLocation(
    slug: string,
  ): Promise<{ root: string; path: string } | null> {
    const roots = this.getRoots();
    for (const root of roots) {
      const filePath = this.getDocPath(root, slug);
      if (await pathExists(filePath)) {
        return { root, path: filePath };
      }
    }
    return null;
  }

  private async readIndex(): Promise<DocMeta[]> {
    const entries = await safeReadJson<DocMeta[]>(INDEX_PATH, []);
    const indexExists = await pathExists(INDEX_PATH);
    if (!indexExists || entries.length === 0) {
      const diskEntries = await this.readDocsFromScanRoots();
      if (diskEntries.length > 0) {
        await this.writeIndex(diskEntries);
        return diskEntries;
      }
    }
    const deduped = this.mergeIndexes([entries]);
    if (deduped.length !== entries.length) {
      await this.writeIndex(deduped);
      return deduped;
    }
    return entries.sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
  }

  private async writeIndex(entries: DocMeta[]) {
    const sorted = [...entries].sort(
      (a, b) =>
        new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
    );
    await ensureDir(path.dirname(INDEX_PATH));
    await atomicWriteJson(INDEX_PATH, sorted);
  }

  private async persistIndex(
    mutator: (records: DocMeta[]) => DocMeta[],
  ): Promise<void> {
    const current = await this.readIndex();
    const next = mutator(current);
    await this.writeIndex(next);
  }

  private normalizeFrontMatter(
    data: Record<string, unknown>,
    slug: string,
    stats?: { birthtime: Date; mtime: Date },
  ): DocMeta {
    const fallbackCreatedAt = stats?.birthtime ?? new Date();
    const fallbackUpdatedAt = stats?.mtime ?? new Date();
    return {
      title: typeof data.title === "string" ? data.title : slug,
      slug: typeof data.slug === "string" ? data.slug : slug,
      excerpt: typeof data.excerpt === "string" ? data.excerpt : "",
      isPublic: Boolean(data.isPublic),
      publicId:
        typeof data.publicId === "string" && data.publicId.length > 0
          ? data.publicId
          : null,
      createdAt:
        typeof data.createdAt === "string"
          ? data.createdAt
          : fallbackCreatedAt.toISOString(),
      updatedAt:
        typeof data.updatedAt === "string"
          ? data.updatedAt
          : fallbackUpdatedAt.toISOString(),
    };
  }

  private async writeDocumentFile(root: string, meta: DocMeta, bodyMd: string) {
    const frontMatter = {
      title: meta.title,
      slug: meta.slug,
      isPublic: meta.isPublic,
      publicId: meta.publicId,
      createdAt: meta.createdAt,
      updatedAt: meta.updatedAt,
    };

    const markdown = matter.stringify(bodyMd.trimEnd() + "\n", frontMatter);
    await ensureDir(root);
    await atomicWriteFile(this.getDocPath(root, meta.slug), markdown);
  }

  private async readDocsFromDisk(root: string): Promise<DocMeta[]> {
    if (!(await pathExists(root))) {
      return [];
    }

    let entries: string[];
    try {
      entries = await fs.readdir(root);
    } catch {
      return [];
    }
    const markdownFiles = entries.filter((entry) => entry.endsWith(".md"));

    const docs = await Promise.all(
      markdownFiles.map(async (filename) => {
        const slug = filename.replace(/\.md$/, "");
        const filePath = path.join(root, filename);
        const raw = await fs.readFile(filePath, "utf8");
        const parsed = matter(raw);
        const stats = await fs.stat(filePath);
        const data = this.normalizeFrontMatter(parsed.data, slug, stats);
        const content = parsed.content.trimEnd();
        return {
          ...data,
          excerpt: data.excerpt || createExcerpt(content),
        };
      }),
    );

    return docs;
  }

  private async readDocsFromScanRoots(): Promise<DocMeta[]> {
    const roots = this.getRoots();
    const entries = await Promise.all(
      roots.map((root) => this.readDocsFromDisk(root)),
    );
    return this.mergeIndexes(entries);
  }

  private mergeIndexes(indexes: DocMeta[][]): DocMeta[] {
    const bySlug = new Map<string, DocMeta>();
    for (const entries of indexes) {
      for (const entry of entries) {
        const existing = bySlug.get(entry.slug);
        if (!existing) {
          bySlug.set(entry.slug, entry);
          continue;
        }
        const existingTime = new Date(existing.updatedAt).getTime();
        const entryTime = new Date(entry.updatedAt).getTime();
        if (entryTime >= existingTime) {
          bySlug.set(entry.slug, entry);
        }
      }
    }
    return Array.from(bySlug.values());
  }

  private indexesEqual(a: DocMeta[], b: DocMeta[]): boolean {
    if (a.length !== b.length) {
      return false;
    }
    const normalize = (entries: DocMeta[]) =>
      [...entries].sort((left, right) => left.slug.localeCompare(right.slug));
    const aSorted = normalize(a);
    const bSorted = normalize(b);
    for (let i = 0; i < aSorted.length; i += 1) {
      const left = aSorted[i];
      const right = bSorted[i];
      if (left.slug !== right.slug) {
        return false;
      }
      if (
        left.title !== right.title ||
        left.excerpt !== right.excerpt ||
        left.isPublic !== right.isPublic ||
        left.publicId !== right.publicId ||
        left.createdAt !== right.createdAt ||
        left.updatedAt !== right.updatedAt
      ) {
        return false;
      }
    }
    return true;
  }

  private scheduleRescan(reason: string) {
    if (watcherTimer) {
      clearTimeout(watcherTimer);
    }
    watcherTimer = setTimeout(() => {
      void this.syncIndexWithDisk(reason);
    }, WATCH_DEBOUNCE_MS);
  }

  private async syncIndexWithDisk(reason: string) {
    try {
      const diskEntries = await this.readDocsFromScanRoots();
      const current = await safeReadJson<DocMeta[]>(INDEX_PATH, []);
      if (!this.indexesEqual(current, diskEntries)) {
        await this.writeIndex(diskEntries);
      }
    } catch (error) {
      console.warn(`Content watcher resync failed (${reason}).`, error);
    }
  }

  private async startWatcher() {
    const scanRoots = getScanRoots();
    const writeRoot = getWriteRoot(scanRoots);
    const roots = this.getRoots();

    await ensureDir(writeRoot);
    for (const root of roots) {
      if (!(await pathExists(root))) {
        continue;
      }
      try {
        const watcher = fsWatch(root, { persistent: true }, (event, filename) => {
          if (filename && !filename.toString().endsWith(".md")) {
            return;
          }
          this.scheduleRescan(`${event}:${filename ?? "unknown"}`);
        });
        activeWatchers.push(watcher);
      } catch (error) {
        console.warn(`Content watcher failed to start for ${root}.`, error);
      }
    }

    const pollInterval = getPollIntervalMs();
    if (pollInterval > 0) {
      pollTimer = setInterval(() => {
        this.scheduleRescan("poll");
      }, pollInterval);
    }

    await this.syncIndexWithDisk("startup");
  }
}

class S3OrGitAdapter implements ContentAdapter {
  constructor(private readonly mode: "s3" | "git") {}

  private notImplemented(): never {
    throw new Error(
      `The ${this.mode.toUpperCase()} content adapter is not implemented yet. ` +
        "See README for guidance on enabling S3 or Git-based storage.",
    );
  }

  async list(): Promise<{ items: DocMeta[]; total: number }> {
    this.notImplemented();
  }

  async getBySlug(): Promise<DocFull | null> {
    this.notImplemented();
  }

  async getByPublicId(): Promise<DocFull | null> {
    this.notImplemented();
  }

  async create(): Promise<DocMeta> {
    this.notImplemented();
  }

  async update(): Promise<DocMeta> {
    this.notImplemented();
  }

  async remove(): Promise<void> {
    this.notImplemented();
  }

  async togglePublic(): Promise<DocMeta> {
    this.notImplemented();
  }

  async exportRaw(): Promise<{ filename: string; content: string }> {
    this.notImplemented();
  }
}

let cachedAdapter: ContentAdapter | null = null;

export function getContentAdapter(): ContentAdapter {
  if (cachedAdapter) {
    return cachedAdapter;
  }

  const mode = (process.env.STORAGE_ADAPTER ?? "fs").toLowerCase();

  if (mode === "s3" || mode === "git") {
    cachedAdapter = new S3OrGitAdapter(mode);
  } else {
    cachedAdapter = new LocalFsAdapter();
  }

  return cachedAdapter;
}

export { LocalFsAdapter, S3OrGitAdapter };
