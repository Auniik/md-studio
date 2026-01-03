import { useState } from "react";
import { ListTreeIcon, XIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { TocItem } from "@/lib/toc";

type TableOfContentsProps = {
  items: TocItem[];
};

export function TableOfContents({ items }: TableOfContentsProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (items.length === 0) {
    return null;
  }

  const handleItemClick = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: "smooth", block: "start" });
      setIsOpen(false);
    }
  };

  return (
    <>
      {/* Mobile/Tablet Toggle Button */}
      <div className="sticky top-4 z-10 flex justify-end lg:hidden">
        <Button
          variant="outline"
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className="shadow-md"
        >
          {isOpen ? (
            <>
              <XIcon className="mr-2 size-4" />
              Close TOC
            </>
          ) : (
            <>
              <ListTreeIcon className="mr-2 size-4" />
              Table of Contents
            </>
          )}
        </Button>
      </div>

      {/* Mobile/Tablet Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-20 bg-black/50 lg:hidden"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* TOC Sidebar */}
      <aside
        className={cn(
          "fixed right-0 top-0 z-30 h-screen w-72 border-l border-border bg-background p-6 transition-transform lg:sticky lg:top-24 lg:z-0 lg:h-auto lg:max-h-[calc(100vh-8rem)] lg:w-64 lg:translate-x-0 lg:border-0 lg:bg-transparent lg:p-0",
          isOpen ? "translate-x-0" : "translate-x-full lg:translate-x-0",
        )}
      >
        <div className="mb-4 flex items-center justify-between lg:mb-3">
          <h3 className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">
            Table of Contents
          </h3>
          <Button
            variant="ghost"
            size="icon"
            className="size-6 lg:hidden"
            onClick={() => setIsOpen(false)}
          >
            <XIcon className="size-4" />
          </Button>
        </div>
      <nav className="flex flex-col gap-1 overflow-y-auto lg:max-h-[calc(100vh-12rem)]">
          {items.map((item) => (
            <button
              key={item.id}
              onClick={() => handleItemClick(item.id)}
              className={cn(
                "block w-full text-left text-sm text-muted-foreground transition-colors hover:text-foreground",
                item.level === 2 && "font-medium",
                item.level === 3 && "pl-4 text-xs",
              )}
            >
              {item.title}
            </button>
          ))}
        </nav>
      </aside>
    </>
  );
}
