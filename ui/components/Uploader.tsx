import { useCallback, useRef, useState } from "react";
import { UploadCloudIcon } from "lucide-react";
import { useRevalidator } from "@remix-run/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { withBasePath, useBasePath } from "@/lib/base-path";

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = [
  "image/png",
  "image/jpeg",
  "image/jpg",
  "image/webp",
  "image/gif",
];

type UploaderProps = {
  onInsert: (snippet: string) => void;
  className?: string;
};

export function Uploader({ onInsert, className }: UploaderProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);
  const { revalidate } = useRevalidator();
  const { basePath } = useBasePath();

  const handleFiles = useCallback(
    async (files: FileList | null) => {
      if (!files || files.length === 0) {
        return;
      }

      const file = files[0];
      if (!ALLOWED_TYPES.includes(file.type)) {
        toast.error("Unsupported file type.");
        return;
      }

      if (file.size > MAX_SIZE) {
        toast.error("Image must be 5MB or less.");
        return;
      }

      try {
        setIsUploading(true);
        const formData = new FormData();
        formData.append("file", file);
        const response = await fetch(withBasePath("/api/upload", basePath), {
          method: "POST",
          body: formData,
        });
        if (!response.ok) {
          const err = await response.json();
          throw new Error(err.error || "Upload failed");
        }
        const result = await response.json();
        const alt = result.alt ?? file.name.replace(/\.[^/.]+$/, "");
        onInsert(`![${alt}](${result.url})`);
        toast.success("Image uploaded. Markdown snippet copied into the editor.");
        revalidate();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to upload image.";
        toast.error(message);
      } finally {
        setIsUploading(false);
        if (inputRef.current) {
          inputRef.current.value = "";
        }
      }
    },
    [onInsert, basePath, revalidate],
  );

  const onDrop = useCallback(
    (event: React.DragEvent<HTMLDivElement>) => {
      event.preventDefault();
      void handleFiles(event.dataTransfer.files);
    },
    [handleFiles],
  );

  const onSelect = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>) => {
      void handleFiles(event.target.files);
    },
    [handleFiles],
  );

  return (
    <div
      className={cn(
        "flex h-32 w-full flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-border bg-muted/20 text-center",
        className,
      )}
      onDragOver={(event) => event.preventDefault()}
      onDrop={onDrop}
    >
      <UploadCloudIcon className="size-8 text-muted-foreground" />
      <div className="flex flex-col gap-1">
        <p className="text-sm font-medium">
          Drag & drop to upload images
        </p>
        <p className="text-xs text-muted-foreground">
          PNG, JPG, JPEG, WEBP, GIF up to 5MB
        </p>
      </div>
      <input
        ref={inputRef}
        type="file"
        accept={ALLOWED_TYPES.join(",")}
        className="hidden"
        onChange={onSelect}
      />
      <Button
        type="button"
        size="sm"
        variant="outline"
        onClick={() => inputRef.current?.click()}
        disabled={isUploading}
      >
        {isUploading ? "Uploading..." : "Choose file"}
      </Button>
    </div>
  );
}
