import type { MetaFunction } from "@remix-run/react";
import { useParams } from "@remix-run/react";
import { useEffect, useState } from "react";

import { MarkdownPreview } from "@/components/MarkdownPreview";
import { Toolbar } from "@/components/Toolbar";
import { AttachmentGallery } from "@/components/AttachmentGallery";
import { withBasePath } from "@/lib/base-path";
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
  return [
    { title: "Shared Document | md-studio" },
    { name: "robots", content: "noindex, nofollow" },
  ];
};

export default function SharedDocPage() {
  const { publicId } = useParams();
  const [doc, setDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [notFound, setNotFound] = useState(false);
  
  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";
  
  useEffect(() => {
    if (!publicId) return;
    
    setNotFound(false);
    const basePath = typeof window !== "undefined" ? (window as any).ENV?.BASE_PATH ?? "" : "";
    fetch(withBasePath(`/api/get?publicId=${encodeURIComponent(publicId)}`, basePath))
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
        if (data?.doc?.isPublic) {
          setDoc(data.doc);
        } else {
          setError("Document not found or not public");
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load document:", err);
        setError("Failed to load document");
        setLoading(false);
      });
  }, [publicId]);
  
  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>;
  }
  
  if (notFound) {
    return <NotFoundPage />;
  }

  if (error || !doc) {
    return <div className="min-h-screen flex items-center justify-center text-red-500">{error || "Document not found"}</div>;
  }
  
  const imageRegex = /!\[([^\]]*)\]\((uploads\/[^)]+)\)/g;
  const images = extractImagePaths(doc.bodyMd || "", imageRegex);
  const wordCount = countWords(doc.bodyMd || "");
  const readingTime = calculateReadingTime(doc.bodyMd || "");

  return (
    <main className="flex flex-col gap-6">
      {/* Document Header */}
      <div className="flex flex-col gap-3">
        <h1 className="text-4xl font-bold tracking-tight">{doc.title}</h1>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-sm text-muted-foreground">
          <span>Updated {formatRelativeDate(doc.updatedAt)}</span>
          <span>•</span>
          <span>{wordCount.toLocaleString()} words</span>
          <span>•</span>
          <span>{readingTime} min read</span>
        </div>
      </div>

      {/* Toolbar */}
      <div>
        <Toolbar
          doc={doc}
          shareBaseUrl={baseUrl}
          allowEdit={false}
          showVisibilityToggle={false}
        />
      </div>

      {/* Content */}
      <article className="prose prose-neutral dark:prose-invert prose-headings:scroll-mt-20 prose-p:leading-7 prose-pre:bg-transparent prose-pre:p-0 mx-auto max-w-4xl">
        <MarkdownPreview content={doc.bodyMd} />
      </article>

      <AttachmentGallery images={images} shareBaseUrl={baseUrl} />
    </main>
  );
}
