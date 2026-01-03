export type TocItem = {
  id: string;
  title: string;
  level: number;
};

/**
 * Generate a URL-safe ID from heading text
 * Matches the behavior of most markdown renderers
 */
export function generateHeadingId(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "") // Remove special chars
    .replace(/\s+/g, "-") // Replace spaces with hyphens
    .replace(/-+/g, "-") // Collapse multiple hyphens
    .replace(/^-|-$/g, ""); // Remove leading/trailing hyphens
}

/**
 * Extract table of contents from markdown content
 * Generates IDs from heading text for linking
 */
export function extractTableOfContents(markdown: string): TocItem[] {
  const headingRegex = /^(#{2,3})\s+(.+)$/gm;
  const toc: TocItem[] = [];
  const idCounts = new Map<string, number>();
  let match: RegExpExecArray | null;

  while ((match = headingRegex.exec(markdown)) !== null) {
    const level = match[1].length; // 2 for ##, 3 for ###
    const title = match[2].trim();
    let id = generateHeadingId(title);

    // Handle duplicate IDs by appending a counter
    const count = idCounts.get(id) ?? 0;
    if (count > 0) {
      id = `${id}-${count}`;
    }
    idCounts.set(generateHeadingId(title), count + 1);

    toc.push({ id, title, level });
  }

  return toc;
}

/**
 * Helper class to track heading IDs and ensure uniqueness
 * Use this when rendering markdown to match TOC IDs
 */
export class HeadingIdGenerator {
  private idCounts = new Map<string, number>();

  generate(text: string): string {
    const baseId = generateHeadingId(text);
    const count = this.idCounts.get(baseId) ?? 0;
    
    let id = baseId;
    if (count > 0) {
      id = `${baseId}-${count}`;
    }
    
    this.idCounts.set(baseId, count + 1);
    return id;
  }

  reset(): void {
    this.idCounts.clear();
  }
}
