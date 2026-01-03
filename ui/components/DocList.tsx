import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  BoxIcon,
  EyeIcon,
  FilePlus2Icon,
  Link2Icon,
  MoreHorizontalIcon,
  PenSquareIcon,
  Trash2Icon,
  LockIcon,
  GlobeIcon,
  SearchIcon,
  Loader2Icon,
  KeyboardIcon,
  FileTextIcon,
} from "lucide-react";
import { Link, useNavigate, useSearchParams, useRevalidator, useFetcher } from "@remix-run/react";
import { toast } from "sonner";

import { ImportButton } from "@/components/ImportButton";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { DocListSkeleton } from "@/components/DocListSkeleton";
import { useDebounce } from "@/lib/hooks/use-debounce";
import type { DocMeta } from "@/lib/content-adapter";
import type { SortBy, FilterBy } from "@/lib/content-adapter";
import { useBasePath, withBasePath } from "@/lib/base-path";
import { formatRelativeDate } from "@/lib/date-utils";

type DocListProps = {
  docs: DocMeta[];
  total: number;
  page: number;
  query: string;
  baseUrl: string;
  pageSize: number;
  sortBy: SortBy;
  filterBy: FilterBy;
};

export function DocList({
  docs: initialDocs,
  total,
  page,
  query,
  baseUrl,
  pageSize,
  sortBy,
  filterBy,
}: DocListProps) {
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { revalidate, state: revalidatorState } = useRevalidator();
  const { basePath } = useBasePath();
  const deleteFetcher = useFetcher();
  const toggleFetcher = useFetcher();
  const loadMoreFetcher = useFetcher<{
    docs: DocMeta[];
    total: number;
    page: number;
  }>();
  const searchRef = useRef<HTMLInputElement>(null);
  const [searchValue, setSearchValue] = useState(query);
  const debouncedSearch = useDebounce(searchValue, 300);
  const [selectedDocs, setSelectedDocs] = useState<Set<string>>(new Set());
  const [isSearching, setIsSearching] = useState(false);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const [visibleDocs, setVisibleDocs] = useState<DocMeta[]>(initialDocs);
  const [loadedPage, setLoadedPage] = useState(page);
  const [visibleTotal, setVisibleTotal] = useState(total);
  const isLoadingMore = loadMoreFetcher.state !== "idle";
  const isPending =
    revalidatorState === "loading" ||
    deleteFetcher.state !== "idle" ||
    toggleFetcher.state !== "idle" ||
    isBulkDeleting;

  const listUrlBase = useMemo(() => {
    const params = new URLSearchParams();
    if (query) params.set("q", query);
    if (sortBy) params.set("sortBy", sortBy);
    if (filterBy) params.set("filterBy", filterBy);
    params.set("pageSize", String(pageSize));
    return params;
  }, [query, sortBy, filterBy, pageSize]);

  const buildListUrl = useCallback(
    (nextPage: number) => {
      const params = new URLSearchParams(listUrlBase);
      params.set("page", String(nextPage));
      return withBasePath(`/api/list?${params.toString()}`, basePath);
    },
    [listUrlBase, basePath],
  );

  const updateSearchParams = useCallback(
    (updates: Record<string, string | number | undefined>) => {
      const params = new URLSearchParams(searchParams.toString());
      Object.entries(updates).forEach(([key, value]) => {
        if (value === undefined || value === "") {
          params.delete(key);
        } else {
          params.set(key, String(value));
        }
      });
      setSearchParams(params);
    },
    [searchParams, setSearchParams],
  );

  // Handle debounced search
  useEffect(() => {
    if (debouncedSearch !== query) {
      setIsSearching(true);
      updateSearchParams({ q: debouncedSearch, page: 1 });
    }
  }, [debouncedSearch, query, updateSearchParams]);

  useEffect(() => {
    if (!isPending) {
      setIsSearching(false);
    }
  }, [isPending]);

  useEffect(() => {
    setSearchValue(query);
  }, [query]);

  useEffect(() => {
    setVisibleDocs(initialDocs);
    setLoadedPage(page);
    setVisibleTotal(total);
    setSelectedDocs(new Set());
    if (typeof window !== "undefined" && query === "" && filterBy === "all" && page === 1) {
      window.dispatchEvent(
        new CustomEvent("md-studio-docs-synced", { detail: { docs: initialDocs } }),
      );
    }
  }, [initialDocs, page, total, query, sortBy, filterBy]);

  useEffect(() => {
    if (!loadMoreFetcher.data?.docs?.length) return;
    setVisibleDocs((prev) => {
      const merged = new Map(prev.map((doc) => [doc.slug, doc]));
      loadMoreFetcher.data.docs.forEach((doc) => merged.set(doc.slug, doc));
      return Array.from(merged.values());
    });
    setLoadedPage(loadMoreFetcher.data.page);
    setVisibleTotal(loadMoreFetcher.data.total);
  }, [loadMoreFetcher.data]);

  useEffect(() => {
    const handleKeydown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isTyping =
        target &&
        ["INPUT", "TEXTAREA"].includes(target.tagName) &&
        !target.hasAttribute("data-hotkey-ignore");

      if (event.key === "Escape") {
        event.preventDefault();
        setSelectedDocs(new Set());
        if (target instanceof HTMLElement) {
          target.blur();
        }
        return;
      }

      if (!isTyping) {
        if (event.key === "n") {
          event.preventDefault();
          navigate(withBasePath("/new", basePath));
        }

        if (event.key === "/") {
          event.preventDefault();
          searchRef.current?.focus();
        }

      }
    };

    window.addEventListener("keydown", handleKeydown);
    return () => window.removeEventListener("keydown", handleKeydown);
  }, [navigate, basePath]);

  const handleTogglePublic = useCallback(
    async (doc: DocMeta) => {
      console.log("handleTogglePublic called for doc:", doc.slug);
      try {
        const formData = new FormData();
        formData.append("slug", doc.slug);
        const response = await fetch(withBasePath("/api/toggle-public", basePath), {
          method: "post",
          body: formData,
        });
        if (!response.ok) {
          throw new Error(`Failed to update "${doc.title}".`);
        }
        setVisibleDocs((prev) =>
          prev.map((item) =>
            item.slug === doc.slug ? { ...item, isPublic: !item.isPublic } : item,
          ),
        );
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("md-studio-docs-updated", {
              detail: { slug: doc.slug, patch: { isPublic: !doc.isPublic } },
            }),
          );
        }
        toast.success(
          doc.isPublic ? "Document is now private." : "Document is now public.",
        );
        revalidate();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to update document.";
        toast.error(message);
      }
    },
    [basePath, revalidate],
  );

  const handleDelete = useCallback(
    async (doc: DocMeta) => {
      const confirmed = window.confirm(
        `Delete "${doc.title}"? This removes the markdown file from storage.`,
      );
      if (!confirmed) return;
      try {
        const formData = new FormData();
        formData.append("slug", doc.slug);
        const response = await fetch(withBasePath("/api/delete", basePath), {
          method: "post",
          body: formData,
        });
        if (!response.ok) {
          throw new Error(`Failed to delete "${doc.title}".`);
        }
        setVisibleDocs((prev) => prev.filter((item) => item.slug !== doc.slug));
        setVisibleTotal((prev) => Math.max(0, prev - 1));
        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("md-studio-docs-deleted", { detail: { slugs: [doc.slug] } }),
          );
        }
        toast.success("Document deleted.");
        setSelectedDocs((prev) => {
          const next = new Set(prev);
          next.delete(doc.slug);
          return next;
        });
        revalidate();
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Failed to delete document.";
        toast.error(message);
      }
    },
    [basePath, revalidate],
  );

  const handleBulkDelete = useCallback(async () => {
    const count = selectedDocs.size;
    const confirmed = window.confirm(
      `Delete ${count} document${count > 1 ? "s" : ""}? This removes the markdown files from storage.`,
    );
    if (!confirmed) return;

    setIsBulkDeleting(true);
    try {
      for (const slug of selectedDocs) {
        const formData = new FormData();
        formData.append("slug", slug);
        const response = await fetch(withBasePath("/api/delete", basePath), {
          method: "post",
          body: formData,
        });
        if (!response.ok) {
          throw new Error(`Failed to delete "${slug}".`);
        }
      }
      setVisibleDocs((prev) =>
        prev.filter((doc) => !selectedDocs.has(doc.slug)),
      );
      setVisibleTotal((prev) => Math.max(0, prev - selectedDocs.size));
      if (typeof window !== "undefined") {
        window.dispatchEvent(
          new CustomEvent("md-studio-docs-deleted", {
            detail: { slugs: Array.from(selectedDocs) },
          }),
        );
      }
      toast.success(`${count} document${count > 1 ? "s" : ""} deleted.`);
      setSelectedDocs(new Set());
      revalidate();
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to delete documents.";
      toast.error(message);
    } finally {
      setIsBulkDeleting(false);
    }
  }, [selectedDocs, basePath, revalidate]);

  const handleCopyShare = useCallback(
    async (doc: DocMeta) => {
      try {
        let nextDoc = doc;
        if (!doc.isPublic) {
          const formData = new FormData();
          formData.append("slug", doc.slug);
          const response = await fetch(withBasePath("/api/toggle-public", basePath), {
            method: "post",
            body: formData,
          });
          const data = await response.json().catch(() => ({}));
          if (!response.ok || !data?.meta) {
            throw new Error("Unable to make document public.");
          }
          nextDoc = data.meta;
          setVisibleDocs((prev) =>
            prev.map((item) => (item.slug === nextDoc.slug ? nextDoc : item)),
          );
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
        const publicId = nextDoc.publicId || nextDoc.slug;
        const sharePath = basePath ? `${basePath}/s/${publicId}` : `/s/${publicId}`;
        const origin =
          typeof window !== "undefined" ? window.location.origin : "";
        const base =
          baseUrl && /^https?:\/\//i.test(baseUrl)
            ? baseUrl
            : baseUrl && baseUrl.startsWith("/")
              ? `${origin}${baseUrl}`
              : origin;
        const url = base ? new URL(sharePath, base).toString() : sharePath;
        await navigator.clipboard.writeText(url);
        toast.success("Share link copied.");
        if (!doc.isPublic) {
          toast.success("Document is now public.");
        }
      } catch (error) {
        const message =
          error instanceof Error
            ? error.message
            : "Unable to copy share link.";
        toast.error(message);
      }
    },
    [baseUrl, basePath],
  );

  const toggleSelectDoc = useCallback((slug: string) => {
    setSelectedDocs((prev) => {
      const next = new Set(prev);
      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }
      return next;
    });
  }, []);

  const toggleSelectAll = useCallback(() => {
    if (selectedDocs.size === visibleDocs.length) {
      setSelectedDocs(new Set());
    } else {
      setSelectedDocs(new Set(visibleDocs.map((d) => d.slug)));
    }
  }, [visibleDocs, selectedDocs.size]);

  const hasResults = visibleDocs.length > 0;
  const allSelected = hasResults && selectedDocs.size === visibleDocs.length;
  const canLoadMore = visibleDocs.length < visibleTotal;

  const handleLoadMore = useCallback(() => {
    if (isLoadingMore || !canLoadMore) return;
    const nextPage = loadedPage + 1;
    loadMoreFetcher.load(buildListUrl(nextPage));
  }, [isLoadingMore, canLoadMore, loadedPage, loadMoreFetcher, buildListUrl]);

  return (
    <div className="flex flex-col gap-6">
      {/* Toolbar */}
      <div className="flex flex-col gap-4">
        {/* Header Row */}
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
            <p className="text-sm text-muted-foreground">
              Manage markdown content stored on the local filesystem.
            </p>
          </div>
          <div className="relative w-full max-w-md">
            <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
            <Input
              ref={searchRef}
              placeholder="Search documents... (Press / to focus)"
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              data-hotkey-ignore
              className="pl-9"
            />
            {isSearching && (
              <Loader2Icon className="absolute right-3 top-1/2 -translate-y-1/2 size-4 animate-spin text-muted-foreground" />
            )}
          </div>
        </div>

        {/* Filters and Sort Row */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={filterBy === "all" ? "default" : "outline"}
              size="sm"
              onClick={() => updateSearchParams({ filterBy: "all", page: 1 })}
            >
              All
            </Button>
            <Button
              variant={filterBy === "public" ? "default" : "outline"}
              size="sm"
              onClick={() => updateSearchParams({ filterBy: "public", page: 1 })}
            >
              <GlobeIcon className="mr-2 size-4" />
              Public
            </Button>
            <Button
              variant={filterBy === "private" ? "default" : "outline"}
              size="sm"
              onClick={() => updateSearchParams({ filterBy: "private", page: 1 })}
            >
              <LockIcon className="mr-2 size-4" />
              Private
            </Button>
            <Select
              value={sortBy}
              onValueChange={(value) =>
                updateSearchParams({ sortBy: value, page: 1 })
              }
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="date-newest">Date: Newest</SelectItem>
                <SelectItem value="date-oldest">Date: Oldest</SelectItem>
                <SelectItem value="updated-newest">Recently Updated</SelectItem>
                <SelectItem value="title-asc">Name: A-Z</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button asChild variant="outline">
              <Link to={withBasePath("/new", basePath)}>
                <FilePlus2Icon className="mr-2 size-4" />
                New
              </Link>
            </Button>
            <ImportButton />
            {hasResults && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={toggleSelectAll}
              >
                {allSelected ? "Clear selection" : "Select all"}
              </Button>
            )}
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selectedDocs.size > 0 && (
          <div className="flex items-center justify-between rounded-lg border bg-muted/50 px-4 py-3">
            <span className="text-sm font-medium">
              {selectedDocs.size} document{selectedDocs.size > 1 ? "s" : ""} selected
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setSelectedDocs(new Set())}
              >
                Clear
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
                disabled={isPending}
              >
                <Trash2Icon className="mr-2 size-4" />
                Delete Selected
              </Button>
            </div>
          </div>
        )}

        {/* Count */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">
            Showing {visibleDocs.length} of {visibleTotal} documents
          </span>
        </div>
      </div>

      {/* Document List */}
      {isPending && !isSearching ? (
        <DocListSkeleton count={pageSize} />
      ) : hasResults ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
          {visibleDocs.map((doc) => (
            <Card
              key={doc.slug}
              className={`group h-full gap-3 border-border/70 py-4 transition-all hover:-translate-y-0.5 hover:border-border hover:bg-muted/30 hover:shadow-md ${
                selectedDocs.has(doc.slug)
                  ? "border-primary/50 ring-2 ring-primary/30"
                  : ""
              }`}
              onClick={(event) => {
                if (event.metaKey || event.ctrlKey) {
                  event.preventDefault();
                  toggleSelectDoc(doc.slug);
                }
              }}
            >
              <CardHeader className="pb-1 pt-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      {doc.isPublic ? (
                        <GlobeIcon className="size-4 text-blue-500 shrink-0" />
                      ) : (
                        <LockIcon className="size-4 text-muted-foreground shrink-0" />
                      )}
                      <CardTitle className="text-base font-semibold line-clamp-1">
                        <Link
                          to={withBasePath(`/doc/${doc.slug}`, basePath)}
                          className="hover:underline"
                          onClick={(event) => event.stopPropagation()}
                        >
                          {doc.title}
                        </Link>
                      </CardTitle>
                    </div>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="flex-1 pt-0">
                <CardDescription className="mt-1 line-clamp-3 text-xs text-muted-foreground">
                  {doc.excerpt || "No excerpt available."}
                </CardDescription>
              </CardContent>
              <CardFooter className="items-center justify-between pt-2">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <span>{formatRelativeDate(doc.updatedAt)}</span>
                  <Badge
                    variant={doc.isPublic ? "default" : "secondary"}
                    className="px-2 py-0 text-[10px]"
                  >
                    {doc.isPublic ? "Public" : "Private"}
                  </Badge>
                </div>
                <div className="flex items-center gap-2">
                  <Button asChild variant="outline" size="icon">
                    <Link
                      to={withBasePath(`/doc/${doc.slug}`, basePath)}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <EyeIcon className="size-4" />
                      <span className="sr-only">View</span>
                    </Link>
                  </Button>
                  <Button asChild variant="outline" size="icon">
                    <Link
                      to={withBasePath(`/doc/${doc.slug}/edit`, basePath)}
                      onClick={(event) => event.stopPropagation()}
                    >
                      <PenSquareIcon className="size-4" />
                      <span className="sr-only">Edit</span>
                    </Link>
                  </Button>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={(event) => event.stopPropagation()}
                      >
                        <MoreHorizontalIcon className="size-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem
                        onClick={() => handleTogglePublic(doc)}
                        disabled={isPending}
                      >
                        <BoxIcon className="mr-2 size-4" />
                        {doc.isPublic ? "Make private" : "Make public"}
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleCopyShare(doc)}>
                        <Link2Icon className="mr-2 size-4" />
                        Copy share link
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => handleDelete(doc)}
                        disabled={isPending}
                      >
                        <Trash2Icon className="mr-2 size-4" />
                        Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </CardFooter>
            </Card>
          ))}
        </div>
      ) : (
        <EnhancedEmptyState
          query={query}
          filterBy={filterBy}
          onAction={() => navigate(withBasePath("/new", basePath))}
        />
      )}

      {hasResults ? (
        <div className="mt-6 flex w-full items-center justify-center gap-3 text-xs text-muted-foreground">
          {canLoadMore ? (
            <span>
              Showing {visibleDocs.length} of {visibleTotal}
            </span>
          ) : null}
          {canLoadMore ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLoadMore}
              disabled={isLoadingMore}
            >
              {isLoadingMore ? "Loading..." : "Load more"}
            </Button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function EnhancedEmptyState({
  query,
  filterBy,
  onAction,
}: {
  query: string;
  filterBy: FilterBy;
  onAction: () => void;
}) {
  const hasFilters = query || filterBy !== "all";

  if (hasFilters) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 rounded-lg border border-dashed border-border p-10 text-center">
        <div className="flex size-12 items-center justify-center rounded-full border border-border bg-muted/40">
          <FileTextIcon className="size-6 text-muted-foreground" />
        </div>
        <div>
          <p className="text-lg font-semibold">No documents found</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Try adjusting your search or filter settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col items-center justify-center gap-6 rounded-lg border border-dashed border-border p-10 text-center">
      <div className="flex size-16 items-center justify-center rounded-full border-2 border-border bg-muted/40">
        <FileTextIcon className="size-8 text-muted-foreground" />
      </div>
      <div className="flex flex-col gap-2">
        <p className="text-xl font-semibold">No documents yet</p>
        <p className="text-sm text-muted-foreground max-w-md">
          Create your first markdown document to get started. You can write, preview, 
          and manage all your content in one place.
        </p>
      </div>
      <Button onClick={onAction} size="lg">
        <FilePlus2Icon className="mr-2 size-4" />
        Create your first document
      </Button>
      <div className="mt-4 rounded-lg border bg-muted/50 p-4 max-w-md">
        <div className="flex items-center gap-2 mb-3">
          <KeyboardIcon className="size-4 text-muted-foreground" />
          <span className="text-sm font-medium">Keyboard Shortcuts</span>
        </div>
        <div className="flex flex-col gap-2 text-sm text-muted-foreground text-left">
          <div className="flex justify-between">
            <span>Create new document</span>
            <kbd className="px-2 py-1 bg-background border rounded text-xs">N</kbd>
          </div>
          <div className="flex justify-between">
            <span>Focus search</span>
            <kbd className="px-2 py-1 bg-background border rounded text-xs">/</kbd>
          </div>
        </div>
      </div>
    </div>
  );
}
