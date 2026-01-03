import type { PointerEvent as ReactPointerEvent } from "react";
import { memo, useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  BoldIcon,
  CheckSquareIcon,
  CodeIcon,
  Heading2Icon,
  ImageIcon,
  ItalicIcon,
  LinkIcon,
  ListIcon,
  MaximizeIcon,
  MinimizeIcon,
  MinusIcon,
  QuoteIcon,
  StrikethroughIcon,
  TableIcon,
} from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { MarkdownPreview } from "@/components/MarkdownPreview";
import { MarkdownHelpModal } from "@/components/MarkdownHelpModal";
import { Uploader } from "@/components/Uploader";
import { cn } from "@/lib/utils";
import { slugify } from "@/lib/slug";
import { useAutosave, useUnsavedChanges, formatTimeSince } from "@/lib/hooks/use-autosave";

type EditorValues = {
  title: string;
  slug?: string;
  bodyMd: string;
};

type EditorProps = {
  initialValues?: EditorValues;
  submitLabel: string;
  successMessage: string;
  onSubmit: (values: EditorValues) => Promise<void>;
};

const TitleEditor = memo(function TitleEditor({
  value,
  onCommit,
}: {
  value: string;
  onCommit: (nextTitle: string) => void;
}) {
  const titleRef = useRef<HTMLHeadingElement>(null);
  const isEditingRef = useRef(false);

  useEffect(() => {
    if (!titleRef.current || isEditingRef.current) return;
    const next = value.trim() || "Untitled document";
    if (titleRef.current.textContent !== next) {
      titleRef.current.textContent = next;
    }
  }, [value]);

  return (
    <h2
      ref={titleRef}
      contentEditable
      suppressContentEditableWarning
      role="textbox"
      aria-label="Document title"
      spellCheck
      onFocus={() => {
        isEditingRef.current = true;
      }}
      onInput={(event) => {
        void event;
      }}
      onBlur={(event) => {
        isEditingRef.current = false;
        const nextTitle = (event.currentTarget.textContent ?? "").trim();
        if (!nextTitle) {
          event.currentTarget.textContent = "Untitled document";
          onCommit("Untitled document");
          return;
        }
        onCommit(nextTitle);
      }}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault();
          event.currentTarget.blur();
        }
      }}
      className="min-w-[12ch] max-w-full truncate text-left text-2xl font-semibold tracking-tight text-foreground outline-none focus-visible:rounded-sm focus-visible:bg-muted/60 focus-visible:px-1 focus-visible:ring-2 focus-visible:ring-primary/30 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      {value.trim() || "Untitled document"}
    </h2>
  );
});

export function Editor({
  initialValues,
  submitLabel,
  successMessage,
  onSubmit,
}: EditorProps) {
  const [title, setTitle] = useState(initialValues?.title ?? "");
  const [slug] = useState(initialValues?.slug ?? "");
  const [body, setBody] = useState(initialValues?.bodyMd ?? "");
  const [isPending, startTransition] = useTransition();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showUploader, setShowUploader] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const previewContainerRef = useRef<HTMLDivElement>(null);
  const splitContainerRef = useRef<HTMLDivElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [splitRatio, setSplitRatio] = useState(0.45);
  const [isDraggingSplit, setIsDraggingSplit] = useState(false);
  const [viewMode, setViewMode] = useState<"split" | "write" | "preview">("split");
  const [toolbarPosition, setToolbarPosition] = useState({ top: 0, left: 0 });
  const [showToolbar, setShowToolbar] = useState(false);
  const [mounted, setMounted] = useState(false);
  const readonlySlugPreview = useMemo(() => {
    if (slug.trim()) return slug.trim();
    const derived = slugify(title);
    return derived || "auto-generated";
  }, [slug, title]);

  // Prevent hydration mismatch with time-based content
  useEffect(() => {
    setMounted(true);
  }, []);

  // Autosave and unsaved changes tracking
  const autosaveKey = `md-cms-draft-${initialValues?.slug || "new"}`;
  const { lastSaved, clearSaved } = useAutosave(
    JSON.stringify({ title, body }),
    {
      key: autosaveKey,
      interval: 30000, // 30 seconds
    }
  );

  const hasUnsavedChanges = useMemo(() => {
    if (!initialValues) return title.length > 0 || body.length > 0;
    return (
      title !== initialValues.title ||
      body !== initialValues.bodyMd
    );
  }, [title, body, initialValues]);

  useUnsavedChanges(hasUnsavedChanges && !isPending);

  const changeViewMode = useCallback((mode: "split" | "write" | "preview") => {
    setViewMode(mode);
    if (mode !== "split") {
      setIsDraggingSplit(false);
    }
  }, []);

  const clampRatio = useCallback((value: number) => {
    return Math.min(0.82, Math.max(0.28, value));
  }, []);

  const surroundSelection = useCallback(
    (open: string, close: string, placeholder: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;

      const start = textarea.selectionStart ?? 0;
      const end = textarea.selectionEnd ?? start;
      const value = textarea.value;
      const selected = value.slice(start, end);
      const content = selected || placeholder;

      const next = value.slice(0, start) + open + content + close + value.slice(end);
      setBody(next);

      const selectionStart = start + open.length;
      const selectionEnd = selectionStart + content.length;
      requestAnimationFrame(() => {
        textarea.focus();
        textarea.setSelectionRange(selectionStart, selectionEnd);
      });
    },
    [],
  );

  const insertSnippet = useCallback((snippet: string, highlight?: [number, number]) => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? start;
    const value = textarea.value;
    const next = value.slice(0, start) + snippet + value.slice(end);
    setBody(next);

    const selectionStart = start + (highlight ? highlight[0] : snippet.length);
    const selectionEnd = start + (highlight ? highlight[1] : snippet.length);

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(selectionStart, selectionEnd);
    });
  }, []);

  const insertLink = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart ?? 0;
    const end = textarea.selectionEnd ?? start;
    const value = textarea.value;
    const selected = value.slice(start, end) || "link text";
    const snippet = `[${selected}](https://)`;
    const next = value.slice(0, start) + snippet + value.slice(end);
    setBody(next);

    const urlStart = start + snippet.indexOf("https://");
    const urlEnd = urlStart + "https://".length;

    requestAnimationFrame(() => {
      textarea.focus();
      textarea.setSelectionRange(urlStart, urlEnd);
    });
  }, []);

  const insertTable = useCallback(() => {
    const tableSnippet = `| Header 1 | Header 2 | Header 3 |\n| --- | --- | --- |\n| Cell 1 | Cell 2 | Cell 3 |\n| Cell 4 | Cell 5 | Cell 6 |\n\n`;
    insertSnippet(tableSnippet, [2, 10]);
  }, [insertSnippet]);

  const insertTaskList = useCallback(() => {
    const taskSnippet = `- [ ] Task 1\n- [ ] Task 2\n- [x] Completed task\n\n`;
    insertSnippet(taskSnippet, [6, 12]);
  }, [insertSnippet]);

  const insertHorizontalRule = useCallback(() => {
    insertSnippet("\n---\n\n", [1, 4]);
  }, [insertSnippet]);

  const toggleFullscreen = useCallback(() => {
    setIsFullscreen((prev) => !prev);
  }, []);

  const isValid =
    (initialValues ? title.trim().length > 0 : true) && body.trim().length > 0;

  const handleSubmit = useCallback(() => {
    if (!isValid || isPending) return;

    startTransition(async () => {
      try {
        const titleToSave = title.trim() || "Untitled document";
        const payload = {
          title: titleToSave,
          bodyMd: body,
        };
        await onSubmit(payload);
        toast.success(successMessage);
        clearSaved(); // Clear autosaved draft after successful submit
      } catch (error) {
        const message =
          error instanceof Error ? error.message : "Unable to save document.";
        toast.error(message);
      }
    });
  }, [isValid, isPending, onSubmit, title, slug, body, successMessage, clearSaved]);

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const isInput =
        target &&
        ["INPUT", "TEXTAREA"].includes(target.tagName) &&
        !target.hasAttribute("data-hotkey-ignore");

      if (event.key === "s" && (event.metaKey || event.ctrlKey)) {
        event.preventDefault();
        handleSubmit();
      }

      void isInput;
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [handleSubmit]);

  useEffect(() => {
    if (!isDraggingSplit || viewMode !== "split") {
      return;
    }

    const handlePointerMove = (event: PointerEvent) => {
      if (!splitContainerRef.current) {
        return;
      }
      const rect = splitContainerRef.current.getBoundingClientRect();
      if (rect.width <= 0) {
        return;
      }
      const ratio = (event.clientX - rect.left) / rect.width;
      setSplitRatio(clampRatio(ratio));
      event.preventDefault();
    };

    const stopDragging = () => {
      setIsDraggingSplit(false);
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: false });
    window.addEventListener("pointerup", stopDragging);
    window.addEventListener("pointercancel", stopDragging);

    return () => {
      window.removeEventListener("pointermove", handlePointerMove);
      window.removeEventListener("pointerup", stopDragging);
      window.removeEventListener("pointercancel", stopDragging);
    };
  }, [clampRatio, isDraggingSplit, viewMode]);

  useEffect(() => {
    if (typeof document === "undefined") return;
    if (isDraggingSplit && viewMode === "split") {
      const originalCursor = document.body.style.cursor;
      const originalUserSelect = document.body.style.userSelect;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
      return () => {
        document.body.style.cursor = originalCursor;
        document.body.style.userSelect = originalUserSelect;
      };
    }
  }, [isDraggingSplit, viewMode]);

  useEffect(() => {
    const textarea = textareaRef.current;
    const preview = previewContainerRef.current;
    if (!textarea || !preview) {
      return;
    }

    const syncScroll = () => {
      if (!preview) return;
      const ratio =
        textarea.scrollTop /
        Math.max(1, textarea.scrollHeight - textarea.clientHeight);
      preview.scrollTop =
        ratio * Math.max(0, preview.scrollHeight - preview.clientHeight);
    };

    textarea.addEventListener("scroll", syncScroll, { passive: true });
    return () => {
      textarea.removeEventListener("scroll", syncScroll);
    };
  }, [body]);

  // Update toolbar position based on cursor
  const updateToolbarPosition = useCallback(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const selectionStart = textarea.selectionStart;
    const textBeforeCursor = textarea.value.substring(0, selectionStart);
    const lines = textBeforeCursor.split('\n');
    const currentLine = lines.length;
    
    // Get textarea bounding rect
    const textareaRect = textarea.getBoundingClientRect();
    
    // Calculate approximate line height
    const lineHeight = parseInt(window.getComputedStyle(textarea).lineHeight) || 28;
    
    // Calculate cursor position
    const cursorTop = (currentLine - 1) * lineHeight - textarea.scrollTop;
    
    // Position toolbar above cursor with some offset
    const toolbarTop = Math.max(10, cursorTop - 50);
    const toolbarLeft = textareaRect.width / 2;
    
    setToolbarPosition({ top: toolbarTop, left: toolbarLeft });
  }, []);

  // Show/hide toolbar on focus/blur and update position on selection change
  useEffect(() => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const handleFocus = () => {
      setShowToolbar(true);
      updateToolbarPosition();
    };

    const handleBlur = (e: FocusEvent) => {
      // Don't hide if clicking on toolbar
      const relatedTarget = e.relatedTarget as HTMLElement;
      if (relatedTarget && toolbarRef.current?.contains(relatedTarget)) {
        return;
      }
      // Delay hiding to allow toolbar clicks
      setTimeout(() => {
        if (document.activeElement !== textarea && !toolbarRef.current?.contains(document.activeElement)) {
          setShowToolbar(false);
        }
      }, 150);
    };

    const handleSelectionChange = () => {
      if (document.activeElement === textarea) {
        updateToolbarPosition();
      }
    };

    const handleClick = () => {
      if (document.activeElement === textarea) {
        updateToolbarPosition();
      }
    };

    textarea.addEventListener('focus', handleFocus);
    textarea.addEventListener('blur', handleBlur);
    textarea.addEventListener('click', handleClick);
    textarea.addEventListener('keyup', handleSelectionChange);
    textarea.addEventListener('mouseup', handleSelectionChange);

    return () => {
      textarea.removeEventListener('focus', handleFocus);
      textarea.removeEventListener('blur', handleBlur);
      textarea.removeEventListener('click', handleClick);
      textarea.removeEventListener('keyup', handleSelectionChange);
      textarea.removeEventListener('mouseup', handleSelectionChange);
    };
  }, [updateToolbarPosition]);

  const editorPaneStyle = useMemo(() => {
    return {
      flexBasis: `${splitRatio * 100}%`,
      flexGrow: 0,
      flexShrink: 0,
    };
  }, [splitRatio]);

  const previewPaneStyle = useMemo(() => {
    const remaining = 1 - splitRatio;
    return {
      flexBasis: `${remaining * 100}%`,
      flexGrow: 0,
      flexShrink: 0,
    };
  }, [splitRatio]);

  const handleDividerPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (viewMode !== "split") return;
      if (event.pointerType === "mouse") {
        event.preventDefault();
      }
      setIsDraggingSplit(true);
    },
    [viewMode],
  );

  const showEditorPane = viewMode !== "preview";
  const showPreviewPane = viewMode !== "write";

  return (
    <TooltipProvider>
      <div className={cn("flex flex-col gap-6", isFullscreen && "fixed inset-0 z-50 bg-background p-6 overflow-y-auto")}>
        <div className="flex flex-col gap-1">
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-2">
              <TitleEditor
                value={title}
                onCommit={(nextTitle) => {
                  setTitle(nextTitle);
                }}
              />
            </div>
          </div>
          <div className="text-[11px] text-muted-foreground">
            Slug: <span className="font-mono text-foreground">{readonlySlugPreview}</span>. Auto-generated and unique.
          </div>
        </div>
      
      {/* Top Control Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-card px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1 rounded-md border border-border bg-muted px-1 py-1">
            {(["write", "split", "preview"] as const).map((mode) => (
              <Button
                key={mode}
                type="button"
                size="sm"
                variant={viewMode === mode ? "default" : "ghost"}
                className={cn(
                  "h-7 px-3 text-xs font-medium",
                  viewMode === mode ? "" : "text-muted-foreground",
                )}
                onClick={() => changeViewMode(mode)}
              >
                {mode === "write" && "Edit"}
                {mode === "split" && "Split"}
                {mode === "preview" && "Preview"}
              </Button>
            ))}
          </div>
          
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="font-mono font-semibold">{body.length.toLocaleString()}</span>
            <span>chars</span>
            <span className="text-border">·</span>
            <span className="font-mono font-semibold">{body.split(/\s+/).filter(Boolean).length.toLocaleString()}</span>
            <span>words</span>
          </div>
          
          {mounted && lastSaved && (
            <span className="text-xs text-muted-foreground">
              · Last saved: {formatTimeSince(lastSaved)}
            </span>
          )}
          {mounted && hasUnsavedChanges && !lastSaved && (
            <span className="text-xs text-amber-600 dark:text-amber-500">· Unsaved changes</span>
          )}
        </div>
        
        <div className="flex items-center gap-2">
          <MarkdownHelpModal />
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={toggleFullscreen}
              >
                {isFullscreen ? (
                  <MinimizeIcon className="mr-1.5 size-3.5" />
                ) : (
                  <MaximizeIcon className="mr-1.5 size-3.5" />
                )}
                {isFullscreen ? "Exit" : "Fullscreen"}
              </Button>
            </TooltipTrigger>
            <TooltipContent>Toggle fullscreen (F11)</TooltipContent>
          </Tooltip>
          <Button type="button" onClick={handleSubmit} disabled={!isValid || isPending} size="sm">
            {isPending ? "Saving..." : submitLabel}
          </Button>
        </div>
      </div>

      {/* Editor Container */}
      <div
        ref={splitContainerRef}
        className={cn(
          "relative flex overflow-hidden rounded-lg border border-border bg-card shadow-sm",
          "min-h-[calc(100vh-28rem)]",
        )}
      >
        {showEditorPane && (
          <div
            className="relative flex flex-col overflow-hidden"
            style={viewMode === "split" ? editorPaneStyle : { flex: 1 }}
          >
            {/* Floating Toolbar - appears near cursor */}
            <div className="relative flex flex-1 flex-col overflow-y-auto">
              {/* Floating Toolbar near cursor */}
              {showToolbar && (
                <div
                  ref={toolbarRef}
                  className="pointer-events-auto absolute z-10 -translate-x-1/2 transition-all duration-150"
                  style={{
                    top: `${toolbarPosition.top}px`,
                    left: `${toolbarPosition.left}px`,
                  }}
                  onMouseDown={(e) => {
                    // Prevent textarea blur when clicking toolbar
                    e.preventDefault();
                  }}
                >
                  <div className="flex items-center gap-1 rounded-lg border border-border bg-background/95 p-1 shadow-lg backdrop-blur-sm">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => {
                            insertSnippet("## Heading\n\n", [3, 10]);
                            textareaRef.current?.focus();
                          }}
                        >
                          <Heading2Icon className="size-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Heading</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => {
                            surroundSelection("**", "**", "bold");
                            textareaRef.current?.focus();
                          }}
                        >
                          <BoldIcon className="size-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Bold</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => {
                            surroundSelection("*", "*", "italic");
                            textareaRef.current?.focus();
                          }}
                        >
                          <ItalicIcon className="size-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Italic</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => {
                            surroundSelection("~~", "~~", "strikethrough");
                            textareaRef.current?.focus();
                          }}
                        >
                          <StrikethroughIcon className="size-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Strikethrough</TooltipContent>
                    </Tooltip>
                    <div className="mx-1 h-4 w-px bg-border" />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => {
                            surroundSelection("`", "`", "code");
                            textareaRef.current?.focus();
                          }}
                        >
                          <CodeIcon className="size-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Code</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => {
                            insertSnippet("> Quote\n\n", [2, 7]);
                            textareaRef.current?.focus();
                          }}
                        >
                          <QuoteIcon className="size-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Quote</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => {
                            insertSnippet("- Item\n", [2, 6]);
                            textareaRef.current?.focus();
                          }}
                        >
                          <ListIcon className="size-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>List</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => {
                            insertTaskList();
                            textareaRef.current?.focus();
                          }}
                        >
                          <CheckSquareIcon className="size-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Tasks</TooltipContent>
                    </Tooltip>
                    <div className="mx-1 h-4 w-px bg-border" />
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => {
                            insertLink();
                            textareaRef.current?.focus();
                          }}
                        >
                          <LinkIcon className="size-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Link</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => {
                            insertTable();
                            textareaRef.current?.focus();
                          }}
                        >
                          <TableIcon className="size-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Table</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => {
                            setShowUploader((prev) => !prev);
                            textareaRef.current?.focus();
                          }}
                        >
                          <ImageIcon className="size-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Image</TooltipContent>
                    </Tooltip>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="size-7"
                          onClick={() => {
                            insertHorizontalRule();
                            textareaRef.current?.focus();
                          }}
                        >
                          <MinusIcon className="size-3.5" />
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Divider</TooltipContent>
                    </Tooltip>
                  </div>
                </div>
              )}
              
              {/* Textarea */}
              <Textarea
                ref={textareaRef}
                value={body}
                onChange={(event) => setBody(event.target.value)}
                className="h-full flex-1 resize-none border-0 bg-transparent px-3 pb-6 pt-2 font-mono text-[15px] leading-7 focus-visible:ring-0"
                placeholder="Start typing your markdown..."
              />
              
              {/* Image Uploader */}
              {showUploader && (
                <div className="border-t border-border px-6 py-4">
                  <Uploader
                    onInsert={insertSnippet}
                    className="h-24 shrink-0 bg-muted/40"
                  />
                </div>
              )}
            </div>
          </div>
        )}

        {/* Resizable Divider */}
        {viewMode === "split" && showEditorPane && showPreviewPane && (
          <div
            role="separator"
            aria-orientation="vertical"
            aria-label="Resize editor and preview"
            className="group relative w-px shrink-0 cursor-col-resize bg-border hover:bg-primary"
            onPointerDown={handleDividerPointerDown}
          >
            <div className="absolute inset-y-0 -left-1 -right-1" />
            <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-muted p-1 opacity-0 transition-opacity group-hover:opacity-100">
              <div className="text-[10px] text-muted-foreground">⇔</div>
            </div>
          </div>
        )}

        {/* Preview Pane */}
        {showPreviewPane && (
          <div
            ref={previewContainerRef}
            className="flex flex-1 flex-col overflow-y-auto px-0 py-0"
            style={viewMode === "split" ? previewPaneStyle : undefined}
          >
            <MarkdownPreview value={body} className="w-full" />
          </div>
        )}
      </div>
      </div>
    </TooltipProvider>
  );
}
