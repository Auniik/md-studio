const FALLBACK_SLUG = "document";

export type SlugAvailabilityChecker = (slug: string) => Promise<boolean>;

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export async function ensureUniqueSlug(
  desired: string | undefined,
  fallbackTitle: string,
  isAvailable: SlugAvailabilityChecker,
) {
  const base = slugify(desired ?? fallbackTitle) || FALLBACK_SLUG;
  let candidate = base;
  let suffix = 2;

  while (!(await isAvailable(candidate))) {
    candidate = `${base}-${suffix}`;
    suffix += 1;
  }

  return candidate;
}
