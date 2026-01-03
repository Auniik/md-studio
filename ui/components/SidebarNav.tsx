import { useEffect, useState } from "react";
import {
  ChevronLeftIcon,
  MenuIcon,
  PlusIcon,
  FileTextIcon,
  Globe2Icon,
} from "lucide-react";
import { Link, useLocation } from "@remix-run/react";

import { ImportButton } from "@/components/ImportButton";
import { Button } from "@/components/ui/button";
import type { DocMeta } from "@/lib/content-adapter";
import { withBasePath, useBasePath } from "@/lib/base-path";
import { cn } from "@/lib/utils";

type SidebarNavProps = {
  docs: DocMeta[];
  dashboardPath: string;
};

export function SidebarNav({ docs, dashboardPath }: SidebarNavProps) {
  const [isOpen, setIsOpen] = useState(true);
  const [isLargeViewport, setIsLargeViewport] = useState(true);
  const [isMobileViewport, setIsMobileViewport] = useState(false);
  const { pathname } = useLocation();
  const { basePath } = useBasePath();

  const toggle = () => setIsOpen((prev) => !prev);
  const handleNavigate = () => {
    if (!isLargeViewport) {
      setIsOpen(false);
    }
  };

  useEffect(() => {
    if (typeof window === "undefined") return;
    const largeMedia = window.matchMedia("(min-width: 1280px)");
    const mobileMedia = window.matchMedia("(max-width: 639px)");
    const handleLargeChange = (event: MediaQueryListEvent) => {
      setIsOpen(event.matches);
      setIsLargeViewport(event.matches);
    };
    const handleMobileChange = (event: MediaQueryListEvent) => {
      setIsMobileViewport(event.matches);
    };

    setIsOpen(largeMedia.matches);
    setIsLargeViewport(largeMedia.matches);
    setIsMobileViewport(mobileMedia.matches);

    if (typeof largeMedia.addEventListener === "function") {
      largeMedia.addEventListener("change", handleLargeChange);
      mobileMedia.addEventListener("change", handleMobileChange);
      return () => {
        largeMedia.removeEventListener("change", handleLargeChange);
        mobileMedia.removeEventListener("change", handleMobileChange);
      };
    }

    largeMedia.addListener(handleLargeChange);
    mobileMedia.addListener(handleMobileChange);
    return () => {
      largeMedia.removeListener(handleLargeChange);
      mobileMedia.removeListener(handleMobileChange);
    };
  }, []);

  return (
    <aside
      className={cn(
        "flex h-full flex-col border-border bg-muted/20 transition-all duration-200 ease-in-out print:hidden",
        "md:static md:translate-x-0 md:shadow-none",
        isMobileViewport && isOpen
          ? "fixed inset-0 z-40 w-screen bg-background"
          : isOpen
            ? "w-72"
            : "w-16",
      )}
    >
      <div className="sticky top-0 z-10 flex shrink-0 items-center gap-2 border-b border-border bg-muted/20 px-2 py-3">
        <Button
          type="button"
          variant="ghost"
          size="icon"
          className="shrink-0"
          onClick={toggle}
          aria-label={isOpen ? "Collapse sidebar" : "Expand sidebar"}
        >
          {isOpen ? (
            <ChevronLeftIcon className="size-4" />
          ) : (
            <MenuIcon className="size-4" />
          )}
        </Button>
        {isOpen ? (
          <div className="flex flex-1 items-center justify-between gap-2">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
              <Link to={dashboardPath}>MD Studio</Link>
            </h2>
            <div className="flex gap-2">
              <ImportButton variant="ghost" size="sm" iconOnly />
              <Button asChild size="sm">
                <Link to={withBasePath("/new", basePath)} onClick={handleNavigate}>
                  <PlusIcon className="mr-2 size-4" aria-hidden="true" />
                  New
                </Link>
              </Button>
            </div>
          </div>
        ) : (
          <>
            <ImportButton variant="ghost" size="icon" iconOnly className="ml-auto hidden md:inline-flex" />
            <Button
              asChild
              size="icon"
              variant="default"
              className="hidden md:inline-flex"
            >
              <Link to={withBasePath("/new", basePath)} onClick={handleNavigate}>
                <PlusIcon className="size-4" aria-hidden="true" />
                <span className="sr-only">Create document</span>
              </Link>
            </Button>
          </>
        )}
      </div>
      <div className="no-scrollbar flex-1 overflow-y-auto px-2 py-4">
        {docs.length === 0 ? (
          <p
            className={cn(
              "rounded-md border border-dashed border-border px-3 py-4 text-center text-xs text-muted-foreground",
              !isOpen && "sr-only",
            )}
          >
            No documents yet. Create your first one!
          </p>
        ) : (
          <nav>
            <ul className="flex flex-col gap-1">
              {docs.map((doc) => {
                const isActive =
                  pathname === `/doc/${doc.slug}` ||
                  pathname === `/doc/${doc.slug}/edit`;
                return (
                  <li key={doc.slug}>
                    <Link
                      to={withBasePath(`/doc/${doc.slug}`, basePath)}
                      onClick={handleNavigate}
                      className={cn(
                        "group flex items-center gap-2 rounded-md px-3 py-2 text-sm transition-colors",
                        "hover:bg-muted hover:text-foreground",
                        isActive
                          ? "bg-muted text-foreground"
                          : "text-muted-foreground",
                        !isOpen && "justify-center",
                      )}
                    >
                      <span
                        className={cn(
                          "relative flex size-5 items-center justify-center",
                        )}
                      >
                        <FileTextIcon className="size-4" aria-hidden="true" />
                        {doc.isPublic ? (
                          <Globe2Icon className="absolute -right-1 -top-1 size-3 text-primary" />
                        ) : null}
                      </span>
                      {isOpen ? (
                        <span className="flex-1 truncate">{doc.title}</span>
                      ) : (
                        <span className="sr-only">{doc.title}</span>
                      )}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </nav>
        )}
      </div>
      {isOpen ? (
        <div className="sticky bottom-0 z-10 shrink-0 border-t border-border bg-muted/20 px-3 py-4 text-xs text-muted-foreground">
          Tip: Press <span className="font-semibold">N</span> for a new document or{" "}
          <span className="font-semibold">/</span> to focus search.
        </div>
      ) : null}
    </aside>
  );
}
