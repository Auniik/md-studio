import type { MetaFunction } from "@remix-run/node";
import { useSearchParams } from "@remix-run/react";
import { useEffect, useState } from "react";

import { DocList } from "@/components/DocList";
import { type SortBy, type FilterBy } from "@/lib/content-adapter";
import { getShareBaseUrl, withBasePath } from "@/lib/base-path";
import { NotFoundPage } from "@/components/not-found-page";

const PAGE_SIZE = 16;

export const meta: MetaFunction = () => {
  return [{ title: "Dashboard | md-studio" }];
};

export default function DashboardPage() {
  const [searchParams] = useSearchParams();
  const [docs, setDocs] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  
  const query = searchParams.get("q") ?? "";
  const pageParam = searchParams.get("page") ?? "1";
  const pageNumber = Number.parseInt(pageParam, 10);
  const page = Number.isFinite(pageNumber) && pageNumber > 0 ? pageNumber : 1;
  const sortBy = (searchParams.get("sortBy") ?? "date-newest") as SortBy;
  const filterBy = (searchParams.get("filterBy") ?? "all") as FilterBy;
  const baseUrl = typeof window !== "undefined" ? (window as any).ENV?.SHARE_BASE_URL ?? "" : "";

  useEffect(() => {
    setLoading(true);
    setNotFound(false);
    const params = new URLSearchParams({
      q: query,
      page: page.toString(),
      sortBy,
      filterBy,
    });
    
    const basePath = typeof window !== "undefined" ? (window as any).ENV?.BASE_PATH ?? "" : "";
    fetch(withBasePath(`/api/list?${params}`, basePath))
      .then(async (res) => {
        if (res.status === 404) {
          setNotFound(true);
          setLoading(false);
          return null;
        }
        if (!res.ok) {
          throw new Error(`Failed to load docs (${res.status})`);
        }
        return res.json();
      })
      .then(data => {
        if (!data) return;
        setDocs(data.docs || data.items || []);
        setTotal(data.total || 0);
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load docs:", err);
        setLoading(false);
      });
  }, [query, page, sortBy, filterBy]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ slugs: string[] }>;
      const slugs = custom.detail?.slugs ?? [];
      if (!slugs.length) return;
      setDocs((prev) => prev.filter((doc) => !slugs.includes(doc.slug)));
      setTotal((prev) => Math.max(0, prev - slugs.length));
    };
    window.addEventListener("md-studio-docs-deleted", handler);
    return () => window.removeEventListener("md-studio-docs-deleted", handler);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ doc: any }>;
      const doc = custom.detail?.doc;
      if (!doc?.slug) return;
      setDocs((prev) => {
        const next = prev.filter((entry) => entry.slug !== doc.slug);
        return [doc, ...next];
      });
      setTotal((prev) => prev + 1);
    };
    window.addEventListener("md-studio-docs-created", handler);
    return () => window.removeEventListener("md-studio-docs-created", handler);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ slug: string; patch: Record<string, any> }>;
      const slug = custom.detail?.slug;
      const patch = custom.detail?.patch ?? {};
      if (!slug) return;
      setDocs((prev) =>
        prev.map((doc) => (doc.slug === slug ? { ...doc, ...patch } : doc)),
      );
    };
    window.addEventListener("md-studio-docs-updated", handler);
    return () => window.removeEventListener("md-studio-docs-updated", handler);
  }, []);

  if (loading && docs.length === 0) {
    return <div className="p-8">Loading...</div>;
  }
  
  if (notFound) {
    return <NotFoundPage />;
  }

  return (
    <main className="flex flex-col gap-6">
      <DocList
        docs={docs}
        total={total}
        page={page}
        query={query}
        baseUrl={baseUrl}
        pageSize={PAGE_SIZE}
        sortBy={sortBy}
        filterBy={filterBy}
      />
    </main>
  );
}
