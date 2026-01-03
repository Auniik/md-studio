import {
  Links,
  Meta,
  Outlet,
  Scripts,
  ScrollRestoration,
} from "@remix-run/react";
import type { LinksFunction, MetaFunction } from "@remix-run/react";
import { useState, useEffect } from "react";

import { BasePathProvider, getBasePath, getDashboardPath, getShareBaseUrl, withBasePath } from "@/lib/base-path";
import { ThemeProvider } from "@/components/theme-provider";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ConditionalSidebar } from "@/components/ConditionalSidebar";
import { Toaster } from "@/components/ui/sonner";
import stylesheet from "@/styles/globals.css?url";
import sonnerStyles from "sonner/dist/styles.css?url";

export const links: LinksFunction = () => [
  { rel: "stylesheet", href: stylesheet },
  { rel: "stylesheet", href: sonnerStyles },
];

export const meta: MetaFunction = () => {
  return [
    { title: "md-studio" },
    { name: "description", content: "File-backed markdown CMS" },
  ];
};

export function Layout({ children }: { children: React.ReactNode }) {
  const [docs, setDocs] = useState<any[]>([]);
  const [basePath, setBasePath] = useState("");
  const [dashboardPath, setDashboardPath] = useState("/");
  
  // Initialize from window.ENV after mount
  useEffect(() => {
    if (typeof window !== "undefined" && (window as any).ENV) {
      setBasePath((window as any).ENV.BASE_PATH || "");
      setDashboardPath((window as any).ENV.DASHBOARD_PATH || "/");
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ slugs: string[] }>;
      const slugs = custom.detail?.slugs ?? [];
      if (!slugs.length) return;
      setDocs((prev) => prev.filter((doc) => !slugs.includes(doc.slug)));
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

  useEffect(() => {
    if (typeof window === "undefined") return;
    const handler = (event: Event) => {
      const custom = event as CustomEvent<{ docs: any[] }>;
      const nextDocs = custom.detail?.docs ?? [];
      setDocs(nextDocs);
    };
    window.addEventListener("md-studio-docs-synced", handler);
    return () => window.removeEventListener("md-studio-docs-synced", handler);
  }, []);
  
  useEffect(() => {
    if (!basePath) return; // Wait until basePath is set
    
    fetch(withBasePath("/api/list", basePath))
      .then(res => res.json())
      .then(data => setDocs(data.docs || data.items || []))
      .catch(err => console.error("Failed to load docs:", err));
  }, [basePath]);
  
  const themeScript = `
    (function() {
      var theme = localStorage.getItem('md-studio-theme') || 'system';
      var resolved = theme;
      if (theme === 'system') {
        resolved = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
      }
      document.documentElement.classList.add(resolved);
    })();
  `;

  const envScript = `
    window.ENV = window.ENV || {};
    window.ENV.BASE_PATH = "/__BASE_PATH__";
    window.ENV.DASHBOARD_PATH = "/";
    window.ENV.SHARE_BASE_URL = "/__BASE_PATH__";
    window.ENV.API_PATH = "/__API_PATH__";
  `;
  
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <base href="/__BASE_PATH__/" />
        <script dangerouslySetInnerHTML={{ __html: envScript }} />
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
        <Meta />
        <Links />
      </head>
      <body className="h-screen overflow-hidden antialiased print-visible">
        <ThemeProvider>
          <BasePathProvider basePath={basePath} dashboardPath={dashboardPath}>
            <div className="flex h-screen overflow-hidden bg-background print-visible">
              <ConditionalSidebar docs={docs} dashboardPath={dashboardPath} />
              <div className="flex-1 overflow-y-auto print-visible">
                <div className="mx-auto flex w-full max-w-[1600px] flex-col px-4 py-6 sm:px-6 lg:px-10 lg:py-8">
                  {children}
                </div>
              </div>
            </div>
            <div className="fixed bottom-6 right-6 z-50 print:hidden">
              <ThemeToggle />
            </div>
            <Toaster position="top-right" richColors closeButton />
          </BasePathProvider>
        </ThemeProvider>
        <ScrollRestoration />
        <Scripts />
      </body>
    </html>
  );
}

export default function App() {
  return <Outlet />;
}
