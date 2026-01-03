import { useEffect, useMemo, useState, useRef } from "react";
import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';
import hljs from 'highlight.js';

import { cn } from "@/lib/utils";

// Configure marked with GFM (GitHub Flavored Markdown)
marked.setOptions({
  gfm: true,
  breaks: false,
});

type MarkdownPreviewProps = {
  value?: string;
  content?: string;
  debounceMs?: number;
  title?: string;
  className?: string;
};

export function MarkdownPreview({
  value,
  content,
  debounceMs = 0,
  title = "Preview",
  className,
}: MarkdownPreviewProps) {
  const markdownContent = value ?? content ?? "";
  const [preview, setPreview] = useState(markdownContent);
  const outputRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handle = setTimeout(() => setPreview(markdownContent), debounceMs);
    return () => clearTimeout(handle);
  }, [markdownContent, debounceMs]);

  const isEmpty = useMemo(
    () => preview.trim().length === 0,
    [preview],
  );

  // Convert markdown to HTML
  const html = useMemo(() => {
    if (isEmpty) return '';
    
    const rawHtml = marked.parse(preview, { async: false }) as string;
    const sanitized = DOMPurify.sanitize(rawHtml, {
      ALLOWED_TAGS: [
        'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
        'p', 'br', 'hr',
        'ul', 'ol', 'li',
        'a', 'img',
        'strong', 'em', 'code', 'pre',
        'blockquote',
        'table', 'thead', 'tbody', 'tr', 'th', 'td',
        'div', 'span',
        'del', 'ins', 'input',
      ],
      ALLOWED_ATTR: [
        'href', 'title', 'alt', 'src',
        'class', 'id',
        'align', 'width', 'height',
        'type', 'checked', 'disabled',
      ],
      ALLOW_DATA_ATTR: false,
    });
    
    return sanitized;
  }, [preview, isEmpty]);

  // Apply syntax highlighting after HTML is rendered
  useEffect(() => {
    if (outputRef.current && html) {
      const codeBlocks = outputRef.current.querySelectorAll('pre code');
      codeBlocks.forEach((block) => {
        hljs.highlightElement(block as HTMLElement);
      });
    }
  }, [html]);

  return (
    <section
      className={cn(
        "flex h-full min-h-[28rem] flex-col overflow-hidden  xl:min-h-[72vh]",
        className,
      )}
    >
      {/* <header className="flex items-center justify-between border-b border-border bg-muted/40 px-4 py-2">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
          {title}
        </h2>
        {!isEmpty ? (
          <span className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
            {preview.length} chars
          </span>
        ) : null}
      </header> */}
      <div className="preview-scroll flex-1 overflow-y-auto px-4">
        {isEmpty ? (<></>
          // <p className="text-sm text-muted-foreground">
          //   Start writing to see the rendered markdown here.
          // </p>
        ) : (
          <div 
            ref={outputRef}
            className="markdown-body"
            dangerouslySetInnerHTML={{ __html: html }}
          />
        )}
      </div>
    </section>
  );
}
