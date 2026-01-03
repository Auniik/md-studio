import { marked } from 'marked';
import DOMPurify from 'isomorphic-dompurify';
import 'highlight.js/styles/github-dark.min.css';
import { useMemo, useRef } from 'react';

import { cn } from "@/lib/utils";
import { useBasePath } from "@/lib/base-path";

// Configure marked with GFM
marked.setOptions({
  gfm: true,
  breaks: false,
});

type MarkdownProps = {
  source: string;
  className?: string;
};

export function Markdown({ source, className }: MarkdownProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const { basePath } = useBasePath();

  const normalizedSource = useMemo(() => {
    if (!basePath) {
      return source;
    }
    return source.replace(
      /!\[([^\]]*)\]\((\/uploads\/[^)]+)\)/g,
      (_match, altText, path) => `![${altText}](${basePath}${path})`,
    );
  }, [source, basePath]);
  
  // Parse and sanitize markdown
  const html = useMemo(() => {
    const rawHtml = marked.parse(normalizedSource, { async: false }) as string;
    
    // Configure DOMPurify to allow all necessary HTML for markdown
    const cleanHtml = DOMPurify.sanitize(rawHtml, {
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
    
    return cleanHtml;
  }, [source]);

  // Apply syntax highlighting after render
  // useEffect(() => {
  //   if (containerRef.current) {
  //     const codeBlocks = containerRef.current.querySelectorAll('pre code');
  //     // codeBlocks.forEach((block) => {
  //     //   hljs.highlightElement(block as HTMLElement);
  //     // });
  //   }
  // }, [html]);

  return (
    <div 
      ref={containerRef}
      className={cn("markdown-body", className)}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
