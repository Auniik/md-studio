import { HelpCircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const markdownGuide = [
  {
    category: "Headers",
    items: [
      { syntax: "# Heading 1", description: "Largest heading" },
      { syntax: "## Heading 2", description: "Second-level heading" },
      { syntax: "### Heading 3", description: "Third-level heading" },
    ],
  },
  {
    category: "Emphasis",
    items: [
      { syntax: "**bold text**", description: "Bold" },
      { syntax: "*italic text*", description: "Italic" },
      { syntax: "~~strikethrough~~", description: "Strikethrough" },
      { syntax: "`code`", description: "Inline code" },
    ],
  },
  {
    category: "Lists",
    items: [
      { syntax: "- Item\n- Item", description: "Unordered list" },
      { syntax: "1. Item\n2. Item", description: "Ordered list" },
      { syntax: "- [ ] Task\n- [x] Done", description: "Task list" },
    ],
  },
  {
    category: "Links & Images",
    items: [
      { syntax: "[Link text](url)", description: "Link" },
      { syntax: "![Alt text](image-url)", description: "Image" },
    ],
  },
  {
    category: "Code Blocks",
    items: [
      { syntax: "```language\ncode here\n```", description: "Code block with syntax highlighting" },
    ],
  },
  {
    category: "Other",
    items: [
      { syntax: "> Quote text", description: "Blockquote" },
      { syntax: "---", description: "Horizontal rule" },
      { syntax: "| Header |\n| --- |\n| Cell |", description: "Table" },
    ],
  },
];

export function MarkdownHelpModal() {
  return (
    <Dialog>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="size-8">
          <HelpCircleIcon className="size-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[80vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Markdown Cheat Sheet</DialogTitle>
          <DialogDescription>
            Quick reference guide for markdown formatting
          </DialogDescription>
        </DialogHeader>
        <div className="flex flex-col gap-6">
          {markdownGuide.map((section) => (
            <div key={section.category}>
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-muted-foreground">
                {section.category}
              </h3>
              <div className="flex flex-col gap-2">
                {section.items.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex flex-col gap-1 rounded-lg border border-border bg-muted/30 p-3"
                  >
                    <code className="rounded bg-muted px-2 py-1 font-mono text-xs">
                      {item.syntax}
                    </code>
                    <span className="text-xs text-muted-foreground">
                      {item.description}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
        <div className="mt-6 rounded-lg bg-muted/50 p-4">
          <h4 className="mb-2 text-sm font-semibold">Keyboard Shortcuts</h4>
          <div className="grid gap-2 text-xs">
            <div className="flex justify-between">
              <span className="text-muted-foreground">Save document</span>
              <kbd className="rounded bg-background px-2 py-1 font-mono">⌘/Ctrl + S</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Bold text</span>
              <kbd className="rounded bg-background px-2 py-1 font-mono">⌘/Ctrl + B</kbd>
            </div>
            <div className="flex justify-between">
              <span className="text-muted-foreground">Italic text</span>
              <kbd className="rounded bg-background px-2 py-1 font-mono">⌘/Ctrl + I</kbd>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
