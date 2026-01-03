import type { MetaFunction } from "@remix-run/react";
import { useParams } from "@remix-run/react";
import { useEffect, useState } from "react";

import { useBasePath, withBasePath } from "@/lib/base-path";
import { MarkdownPreview } from "@/components/MarkdownPreview";
import { Toolbar } from "@/components/Toolbar";
import { Breadcrumb } from "@/components/Breadcrumb";
import { AttachmentGallery } from "@/components/AttachmentGallery";
import { TableOfContents } from "@/components/TableOfContents";
import { extractTableOfContents } from "@/lib/toc";
import { formatRelativeDate, calculateReadingTime, countWords } from "@/lib/date-utils";
import { NotFoundPage } from "@/components/not-found-page";

function extractImagePaths(markdown: string, imageRegex: RegExp) {
  const matches = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = imageRegex.exec(markdown)) !== null) {
    matches.add(match[1]);
  }
  return Array.from(matches);
}

export const meta: MetaFunction = () => {
  return [{ title: "Document | md-studio" }];
};

export default function DocViewPage() {
  const { slug } = useParams();
  const { dashboardPath } = useBasePath();
  const [doc, setDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  
  const baseUrl = typeof window !== "undefined" ? (window as any).ENV?.SHARE_BASE_URL ?? "" : "";
  
  useEffect(() => {
    if (!slug) return;
    
    setLoading(true);
    setNotFound(false);
    const basePath = typeof window !== "undefined" ? (window as any).ENV?.BASE_PATH ?? "" : "";
    fetch(withBasePath(`/api/get?slug=${encodeURIComponent(slug)}`, basePath))
      .then(async (res) => {
        if (res.status === 404) {
          setNotFound(true);
          setLoading(false);
          return null;
        }
        if (!res.ok) {
          throw new Error(`Failed to load document (${res.status})`);
        }
        return res.json();
      })
      .then(data => {
        if (!data) return;
        if (data?.doc) {
          setDoc(data.doc);
        } else {
          setError("Document not found");
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load document:", err);
        setError("Failed to load document");
        setLoading(false);
      });
  }, [slug]);
  
  if (loading) {
    return <div className="p-8">Loading...</div>;
  }
  
  if (notFound) {
    return <NotFoundPage />;
  }

  if (error || !doc) {
    return <div className="p-8 text-red-500">{error || "Document not found"}</div>;
  }
  
  const imageRegex = /!\[([^\]]*)\]\((uploads\/[^)]+)\)/g;
  const images = extractImagePaths(doc.bodyMd || "", imageRegex);
  const wordCount = countWords(doc.bodyMd || "");
  const readingTime = calculateReadingTime(doc.bodyMd || "");

  return (
    <main className="flex flex-col gap-6">
      {/* Breadcrumb Navigation */}
      <Breadcrumb items={[{ label: doc.title }]} dashboardPath={dashboardPath} />

      {/* Document Header */}
      <div className="flex flex-col gap-3">
        <h1 className="text-4xl font-bold tracking-tight">{doc.title}</h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <span>Created {formatRelativeDate(doc.createdAt)}</span>
          <span>•</span>
          <span>Updated {formatRelativeDate(doc.updatedAt)}</span>
          <span>•</span>
          <span>{wordCount.toLocaleString()} words</span>
          <span>•</span>
          <span>{readingTime} min read</span>
        </div>
      </div>

      {/* Toolbar */}
      <div>
        <Toolbar doc={doc} shareBaseUrl={baseUrl} allowEdit showVisibilityToggle />
      </div>

      {/* Content with TOC */}
      <div className="max-w-4xl">
        <article className="prose prose-neutral dark:prose-invert prose-headings:scroll-mt-20 prose-p:leading-7 prose-pre:bg-transparent prose-pre:p-0">
          <MarkdownPreview content={doc.bodyMd || ""} />
        </article>
      </div>

      {/* Attachment Gallery */}
      <AttachmentGallery images={images} shareBaseUrl={baseUrl} />
    </main>
  );
}
