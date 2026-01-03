import { useEffect, useState } from "react";
import {
  CopyIcon,
  DownloadIcon,
  MoreHorizontalIcon,
  PencilIcon,
  PrinterIcon,
  ShieldOffIcon,
  ShieldCheckIcon,
  Loader2Icon,
} from "lucide-react";
import { Link } from "@remix-run/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import type { DocMeta } from "@/lib/content-adapter";
import { withBasePath, useBasePath } from "@/lib/base-path";

type ToolbarProps = {
  doc: DocMeta;
  allowEdit?: boolean;
  shareBaseUrl?: string;
  showVisibilityToggle?: boolean;
};

export function Toolbar({
  doc,
  allowEdit = true,
  shareBaseUrl,
  showVisibilityToggle = true,
}: ToolbarProps) {
  const { basePath } = useBasePath();
  const [isPending, setIsPending] = useState(false);
  const [localDoc, setLocalDoc] = useState(doc);
  const [isToggling, setIsToggling] = useState(false);
  const isExporting = false;

  useEffect(() => {
    setLocalDoc(doc);
  }, [doc]);

  const buildShareLink = (publicId: string) => {
    const sharePath = basePath ? `${basePath}/s/${publicId}` : `/s/${publicId}`;
    const origin =
      typeof window !== "undefined" ? window.location.origin : "";
    const base =
      shareBaseUrl && /^https?:\/\//i.test(shareBaseUrl)
        ? shareBaseUrl
        : shareBaseUrl && shareBaseUrl.startsWith("/")
          ? `${origin}${shareBaseUrl}`
          : origin;
    return base ? new URL(sharePath, base).toString() : sharePath;
  };

  const handleTogglePublic = async () => {
    setIsToggling(true);
    try {
      const formData = new FormData();
      formData.append("slug", localDoc.slug);
      const response = await fetch(withBasePath("/api/toggle-public", basePath), {
        method: "post",
        body: formData,
      });
      const data = await response.json().catch(() => ({}));
      if (!response.ok || !data?.meta) {
        throw new Error("Failed to update visibility.");
      }
      const nextDoc = { ...localDoc, ...data.meta };
      setLocalDoc(nextDoc);
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("md-studio-docs-updated", {
            detail: {
              slug: nextDoc.slug,
              patch: { isPublic: nextDoc.isPublic, publicId: nextDoc.publicId },
            },
          }),
        );
      }
      toast.success(
        nextDoc.isPublic ? "Document is now public." : "Document is now private.",
      );
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to update visibility.";
      toast.error(message);
    } finally {
      setIsToggling(false);
    }
  };

  const handleCopyLink = async () => {
    setIsPending(true);
    try {
      let publicId = localDoc.publicId;

      if (!localDoc.isPublic) {
        const response = await fetch(withBasePath("/api/toggle-public", basePath), {
          method: "POST",
          body: new URLSearchParams({ slug: localDoc.slug }),
        });
        const data = (await response.json()) as {
          success?: boolean;
          meta?: { publicId?: string };
          error?: string;
        };
        if (!response.ok || !data.success) {
          throw new Error(data.error || "Unable to make document public.");
        }
        publicId = data.meta?.publicId ?? publicId;
        const nextDoc = { ...localDoc, ...data.meta, isPublic: true };
        setLocalDoc(nextDoc);
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("md-studio-docs-updated", {
              detail: {
                slug: nextDoc.slug,
                patch: { isPublic: nextDoc.isPublic, publicId: nextDoc.publicId },
              },
            }),
          );
        }
      }

      if (!publicId) {
        toast.error("Share link unavailable for this document.");
        setIsPending(false);
        return;
      }

      const shareLink = buildShareLink(publicId);
      await navigator.clipboard.writeText(shareLink);
      toast.success("Share link copied to clipboard.");

      if (!localDoc.isPublic) {
        toast.success("Document is now public.");
      }
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : "Unable to copy link. Please copy it manually.";
      toast.error(message);
    } finally {
      setIsPending(false);
    }
  };

  const handleDownload = async () => {
    setIsPending(true);
    try {
      // Use fetcher to get export data
      const response = await fetch(withBasePath("/api/export", basePath), {
        method: "POST",
        body: new URLSearchParams({ slug: localDoc.slug }),
      });
      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || "Export failed");
      }
      
      const blob = new Blob([data.content], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = data.filename;
      anchor.click();
      URL.revokeObjectURL(url);
      toast.success("Download started.");
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to download markdown.";
      toast.error(message);
    } finally {
      setIsPending(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card p-4 shadow-sm">
      <div className="flex items-center gap-2">
        <Badge variant={localDoc.isPublic ? "default" : "secondary"}>
          {localDoc.isPublic ? "Public" : "Private"}
        </Badge>
        <span className="text-sm text-muted-foreground">
          Updated{" "}
          {new Date(localDoc.updatedAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
            timeZone: "UTC",
          })}
        </span>
      </div>
      <div className="flex items-center gap-2">
        {allowEdit ? (
          <Link to={withBasePath(`/doc/${localDoc.slug}/edit`, basePath)}>
            <Button variant="outline" size="sm">
              <PencilIcon className="mr-2 size-4" />
              Edit
            </Button>
          </Link>
        ) : null}
        {showVisibilityToggle ? (
          <Button
            variant={localDoc.isPublic ? "secondary" : "default"}
            size="sm"
            onClick={handleTogglePublic}
            disabled={isPending || isToggling}
          >
            {isToggling ? (
              <Loader2Icon className="mr-2 size-4 animate-spin" />
            ) : localDoc.isPublic ? (
              <>
                <ShieldOffIcon className="mr-2 size-4" />
                Make private
              </>
            ) : (
              <>
                <ShieldCheckIcon className="mr-2 size-4" />
                Make public
              </>
            )}
          </Button>
        ) : null}
        {allowEdit ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <MoreHorizontalIcon className="size-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleDownload} disabled={isPending || isExporting}>
                <DownloadIcon className="mr-2 size-4" />
                Download markdown
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handlePrint}>
                <PrinterIcon className="mr-2 size-4" />
                Print
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleCopyLink} disabled={isPending}>
                <CopyIcon className="mr-2 size-4" />
                Copy share link
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : (
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              type="button"
              onClick={handleDownload}
              disabled={isPending || isExporting}
            >
              <DownloadIcon className="mr-2 size-4" />
              Download
            </Button>
            <Button variant="outline" size="sm" type="button" onClick={handlePrint}>
              <PrinterIcon className="mr-2 size-4" />
              Print
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
