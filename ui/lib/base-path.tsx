import { createContext, useContext } from "react";

declare global {
  interface Window {
    ENV?: {
      BASE_PATH?: string;
      DASHBOARD_PATH?: string;
      SHARE_BASE_URL?: string;
      API_PATH?: string;
    };
  }
}

interface BasePathContextValue {
  basePath: string;
  dashboardPath: string;
}

const BasePathContext = createContext<BasePathContextValue | null>(null);

export function BasePathProvider({
  children,
  basePath,
  dashboardPath,
}: {
  children: React.ReactNode;
  basePath: string;
  dashboardPath: string;
}) {
  return (
    <BasePathContext.Provider value={{ basePath, dashboardPath }}>
      {children}
    </BasePathContext.Provider>
  );
}

/**
 * Hook to get the basePath and dashboardPath in client components.
 * Must be used within a BasePathProvider.
 */
export function useBasePath() {
  const context = useContext(BasePathContext);
  if (context === null) {
    throw new Error("useBasePath must be used within a BasePathProvider");
  }
  return context;
}

// ─────────────────────────────────────────────────────────────────────────────
// Utility functions for loaders/actions (server-side)
// ─────────────────────────────────────────────────────────────────────────────

function normalizeBasePath(raw: string | undefined): string {
  if (!raw) return "";
  const trimmed = raw.trim();
  if (!trimmed || trimmed === "/") return "";
  const cleaned = trimmed.replace(/^\/+|\/+$/g, "");
  return cleaned ? `/${cleaned}` : "";
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function normalizeApiPath(raw: string | undefined): string {
  if (!raw) return "/api";
  const trimmed = raw.trim();
  if (!trimmed) return "/api";
  const cleaned = trimmed.replace(/^\/+|\/+$/g, "");
  return cleaned ? `/${cleaned}` : "/api";
}

/**
 * Get the base path from environment variable (server-side).
 * In Remix, this reads from process.env.BASE_PATH.
 */
export function getBasePath(): string {
  if (typeof window !== "undefined" && window.ENV?.BASE_PATH !== undefined) {
    return normalizeBasePath(window.ENV.BASE_PATH);
  }
  return normalizeBasePath(process.env.BASE_PATH);
}

export function getApiPath(): string {
  if (typeof window !== "undefined" && window.ENV?.API_PATH !== undefined) {
    return normalizeApiPath(window.ENV.API_PATH);
  }
  return normalizeApiPath(process.env.API_PATH);
}

export function normalizeDashboardPath(raw: string | undefined): string {
  if (!raw || !raw.trim()) return "/";
  const trimmed = raw.trim();
  const cleaned = trimmed.replace(/^\/+|\/+$/g, "");
  return cleaned ? `/${cleaned}` : "/";
}

export function getDashboardPath(): string {
  if (typeof window !== "undefined" && window.ENV?.DASHBOARD_PATH !== undefined) {
    return normalizeDashboardPath(window.ENV.DASHBOARD_PATH);
  }
  return normalizeDashboardPath(process.env.DASHBOARD_PATH);
}

export function getDashboardSegment(): string {
  return getDashboardPath().replace(/^\/+/, "");
}

/**
 * Prepend basePath to a pathname if needed.
 * @param pathname - The path to prepend basePath to
 * @param basePath - Optional basePath override (for client components using context)
 */
export function withBasePath(pathname: string, basePath?: string): string {
  const bp = basePath ?? getBasePath();
  const apiPath = getApiPath();
  let normalized = pathname.startsWith("/") ? pathname : `/${pathname}`;
  if (normalized === "/api" || normalized.startsWith("/api/")) {
    normalized = `${apiPath}${normalized.slice(4)}`;
  }
  
  if (!bp || bp === "/") {
    return normalized;
  }

  if (typeof window !== "undefined") {
    const remixBasename = (window as any).__remixContext?.basename;
    if (remixBasename && remixBasename === bp) {
      const isResourcePath =
        normalized.startsWith(apiPath) ||
        normalized.startsWith("/uploads") ||
        normalized.startsWith("/assets");
      if (!isResourcePath) {
        return normalized;
      }
      return bp ? `${bp}${normalized}` : normalized;
    }
  }
  
  if (normalized === bp || normalized.startsWith(`${bp}/`)) {
    return normalized;
  }
  
  return `${bp}${normalized}`;
}

export function getShareBaseUrl(): string {
  if (typeof window !== "undefined" && window.ENV?.SHARE_BASE_URL !== undefined) {
    const baseUrl = window.ENV.SHARE_BASE_URL?.replace(/\/$/, "") ?? "";
    const basePath = getBasePath();
    if (basePath && baseUrl.endsWith(basePath)) {
      return baseUrl.slice(0, -basePath.length);
    }
    return baseUrl;
  }
  const baseUrl = process.env.BASE_URL?.replace(/\/$/, "") ?? "";
  const basePath = getBasePath();
  if (basePath && baseUrl.endsWith(basePath)) {
    return baseUrl.slice(0, -basePath.length);
  }
  return baseUrl;
}

export function getUploadsRegex(basePath?: string): RegExp {
  const bp = basePath ?? getBasePath();
  if (!bp) {
    return /!\[[^\]]*\]\((\/uploads\/[^)]+)\)/g;
  }

  const escaped = escapeRegExp(bp);
  return new RegExp(
    `!\\[[^\\]]*\\]\\((${escaped}\\/uploads\\/[^)]+|\\/uploads\\/[^)]+)\\)`,
    "g",
  );
}

/**
 * Build a full share link for a public document.
 * @param publicId - The public ID of the document
 * @param baseUrl - The base URL (from loader data or getShareBaseUrl())
 * @returns Full URL to the public share page
 */
export function buildShareLink(publicId: string, baseUrl: string): string {
  const cleanBaseUrl = baseUrl.replace(/\/$/, "");
  const basePath = getBasePath();
  return `${cleanBaseUrl}${basePath}/s/${publicId}`;
}

export { normalizeBasePath };
