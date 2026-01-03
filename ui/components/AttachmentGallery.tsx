import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { withBasePath } from "@/lib/base-path";

type AttachmentGalleryProps = {
  images: string[];
  shareBaseUrl: string;
};

export function AttachmentGallery({ images, shareBaseUrl }: AttachmentGalleryProps) {
  if (!images.length) return null;

  const base = shareBaseUrl.replace(/\/$/, "");

  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-lg font-semibold">Attached images</h2>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {images.map((src) => {
          const normalizedSrc = withBasePath(src);
          const snippet = `![image](${normalizedSrc})`;
          const absolute =
            base && base.length
              ? `${base}${normalizedSrc}`
              : typeof window !== "undefined"
                ? `${window.location.origin}${normalizedSrc}`
                : normalizedSrc;

          return (
            <div key={src} className="flex flex-col gap-3 rounded-lg border border-border p-3">
              <div className="relative h-40 overflow-hidden rounded-md border bg-muted">
                <img src={normalizedSrc} alt="Attached image" className="size-full object-cover" />
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="w-full"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(snippet);
                    toast.success("Markdown copied.");
                  } catch {
                    toast.error("Unable to copy markdown.");
                  }
                }}
              >
                Copy markdown
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="w-full"
                onClick={async () => {
                  try {
                    await navigator.clipboard.writeText(absolute);
                    toast.success("Image URL copied.");
                  } catch {
                    toast.error("Unable to copy URL.");
                  }
                }}
              >
                Copy image URL
              </Button>
            </div>
          );
        })}
      </div>
    </section>
  );
}
