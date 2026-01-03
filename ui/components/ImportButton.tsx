import { useRef, useState } from "react";
import { ImportIcon, AlertCircleIcon } from "lucide-react";
import { useFetcher, useRevalidator } from "@remix-run/react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { slugify } from "@/lib/slug";
import { useBasePath, withBasePath } from "@/lib/base-path";

type ImportButtonProps = {
  variant?: "default" | "outline" | "ghost";
  size?: "default" | "sm" | "lg" | "icon";
  iconOnly?: boolean;
  className?: string;
};

type FileWithMetadata = {
  file: File;
  title: string;
  slug: string;
  hasConflict: boolean;
  customSlug?: string;
  action?: 'replace' | 'rename';
};

export function ImportButton({ variant = "outline", size = "default", iconOnly = false, className }: ImportButtonProps) {
  const { basePath } = useBasePath();
  const fetcher = useFetcher<{ success: boolean; successful?: { slug: string; title: string }[]; failed?: { filename: string; error: string }[]; error?: string }>();
  const slugCheckFetcher = useFetcher<{ exists: boolean }>();
  const { revalidate } = useRevalidator();
  const [open, setOpen] = useState(false);
  const [files, setFiles] = useState<FileList | null>(null);
  const [fileMetadata, setFileMetadata] = useState<FileWithMetadata[]>([]);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const isPending = fetcher.state !== "idle" || isProcessing;

  const reset = () => {
    setFiles(null);
    setFileMetadata([]);
    setShowConflictDialog(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFiles = event.target.files;
    setFiles(selectedFiles);
    
    if (!selectedFiles || selectedFiles.length === 0) return;

    // Process files to extract metadata and check for conflicts
    setIsProcessing(true);
    try {
      const filesArray = Array.from(selectedFiles);
      const metadata: FileWithMetadata[] = [];

      for (const file of filesArray) {
        // Just extract title from filename, let server parse the markdown
        const title = file.name.replace(/\.md$/, "").replace(/[-_]/g, " ");
        const slug = slugify(title);
        
        // Check if this slug already exists via API
        const response = await fetch(withBasePath(`/api/import?slug=${encodeURIComponent(slug)}`, basePath));
        const data = await response.json();
        
        metadata.push({
          file,
          title,
          slug,
          hasConflict: data.exists,
        });
      }

      setFileMetadata(metadata);
      
      // If any conflicts, show conflict resolution dialog
      if (metadata.some(m => m.hasConflict)) {
        setShowConflictDialog(true);
      }
    } finally {
      setIsProcessing(false);
    }
  };

  const handleImport = async () => {
    if (!files || files.length === 0) {
      toast.error("Choose at least one markdown file to import.");
      return;
    }

    // Check if there are unresolved conflicts
    const hasUnresolvedConflicts = fileMetadata.some(
      m => m.hasConflict && m.action !== 'replace' && !m.customSlug
    );

    if (hasUnresolvedConflicts) {
      toast.error("Please resolve all conflicts by choosing Replace or providing a custom slug.");
      return;
    }

    setIsProcessing(true);
    try {
      // Build FormData for import
      const formData = new FormData();
      
      for (let i = 0; i < fileMetadata.length; i++) {
        const meta = fileMetadata[i];
        
        // Append the actual File object, not just its content
        formData.append(`file_${i}`, meta.file);
        formData.append(`filename_${i}`, meta.file.name);
        formData.append(`slug_${i}`, meta.action === 'replace' ? meta.slug : (meta.customSlug || meta.slug));
        formData.append(`replace_${i}`, meta.action === 'replace' ? "true" : "false");
      }
      
      const response = await fetch(withBasePath("/api/import", basePath), {
        method: "POST",
        body: formData,
      });
      
      const data = await response.json();
      
      if (data.success) {
        if (data.successful && data.successful.length > 0) {
          toast.success(
            `Successfully imported ${data.successful.length} document${data.successful.length > 1 ? "s" : ""}.`
          );
        }
        
        if (data.failed && data.failed.length > 0) {
          toast.error(
            `Failed to import ${data.failed.length} file${data.failed.length > 1 ? "s" : ""}: ${data.failed.map((f: { filename: string }) => f.filename).join(", ")}`
          );
        }
        
        setOpen(false);
        reset();
        revalidate();
      } else {
        toast.error(data.error || "Unable to import markdown.");
      }
    } catch (error) {
      console.error('Import error:', error);
      const message =
        error instanceof Error ? error.message : "Unable to import markdown.";
      toast.error(message);
    } finally {
      setIsProcessing(false);
    }
  };

  const updateCustomSlug = (index: number, newSlug: string) => {
    setFileMetadata(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], customSlug: slugify(newSlug), action: 'rename' };
      return updated;
    });
  };

  const setFileAction = (index: number, action: 'replace' | 'rename') => {
    setFileMetadata(prev => {
      const updated = [...prev];
      updated[index] = { ...updated[index], action };
      return updated;
    });
  };

  return (
    <>
      <Dialog open={open} onOpenChange={(next) => {
        setOpen(next);
        if (!next) reset();
      }}>
        <DialogTrigger asChild>
          <Button variant={variant} size={size} className={className}>
            <ImportIcon className={iconOnly ? "size-4" : "mr-2 size-4"} />
            {!iconOnly && "Import"}
            {iconOnly && <span className="sr-only">Import markdown files</span>}
          </Button>
        </DialogTrigger>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Import markdown files</DialogTitle>
            <DialogDescription>
              Upload one or more markdown files. Titles will be extracted from front matter or filenames.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium">Markdown files</label>
              <Input 
                ref={fileInputRef} 
                type="file" 
                accept=".md" 
                multiple 
                onChange={handleFileChange}
                disabled={isPending}
              />
              {files && files.length > 0 && (
                <p className="text-sm text-muted-foreground">
                  {files.length} file{files.length > 1 ? "s" : ""} selected
                </p>
              )}
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button onClick={handleImport} disabled={isPending || !files || files.length === 0}>
              {isPending ? "Importing..." : isProcessing ? "Processing..." : "Import"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Conflict Resolution Dialog */}
      <Dialog open={showConflictDialog} onOpenChange={setShowConflictDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Resolve Slug Conflicts</DialogTitle>
            <DialogDescription>
              Some files have slugs that already exist. Please provide unique slugs for these files.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col gap-4">
            {fileMetadata.map((meta, index) => (
              <div key={index} className="flex flex-col gap-2 rounded-lg border p-4">
                <div className="flex items-start gap-2">
                  {meta.hasConflict && (
                    <AlertCircleIcon className="size-5 text-destructive mt-0.5 shrink-0" />
                  )}
                  <div className="flex flex-col gap-2">
                    <div>
                      <p className="font-medium">{meta.file.name}</p>
                      <p className="text-sm text-muted-foreground">Title: {meta.title}</p>
                    </div>
                    {meta.hasConflict ? (
                      <div className="flex flex-col gap-3">
                        <p className="text-sm font-medium text-destructive">
                          Slug &ldquo;{meta.slug}&rdquo; already exists
                        </p>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant={meta.action === 'replace' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setFileAction(index, 'replace')}
                            className="flex-1"
                          >
                            Replace Existing
                          </Button>
                          <Button
                            type="button"
                            variant={meta.action === 'rename' ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setFileAction(index, 'rename')}
                            className="flex-1"
                          >
                            Rename Slug
                          </Button>
                        </div>
                        {meta.action === 'rename' && (
                          <div className="flex flex-col gap-1">
                            <label className="text-sm font-medium">
                              Enter a unique slug:
                            </label>
                            <Input
                              placeholder="Enter unique slug"
                              value={meta.customSlug || ''}
                              onChange={(e) => updateCustomSlug(index, e.target.value)}
                            />
                          </div>
                        )}
                        {meta.action === 'replace' && (
                          <p className="text-sm text-muted-foreground">
                            The existing document will be overwritten with this file.
                          </p>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">
                        Slug: <code className="text-xs bg-muted px-1 py-0.5 rounded">{meta.slug}</code>
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => {
              setShowConflictDialog(false);
              reset();
            }}>
              Cancel
            </Button>
            <Button 
              onClick={() => {
                setShowConflictDialog(false);
                handleImport();
              }}
              disabled={fileMetadata.some(m => m.hasConflict && m.action !== 'replace' && !m.customSlug)}
            >
              Continue Import
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
