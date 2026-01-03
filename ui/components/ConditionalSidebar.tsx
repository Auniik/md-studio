import { useLocation } from "@remix-run/react";
import { SidebarNav } from "@/components/SidebarNav";
import type { DocMeta } from "@/lib/doc-types";
import { useBasePath } from "@/lib/base-path";

type ConditionalSidebarProps = {
  docs: DocMeta[];
  dashboardPath: string;
};

export function ConditionalSidebar({ docs, dashboardPath }: ConditionalSidebarProps) {
  const { pathname } = useLocation();
  const { basePath } = useBasePath();
  const normalizedPath = pathname ? pathname.replace(/\/+$/, "") || "/" : "";
  const normalizedBasePath = basePath.replace(/\/+$/, "");
  const strippedPath =
    normalizedBasePath && normalizedPath.startsWith(normalizedBasePath)
      ? normalizedPath.slice(normalizedBasePath.length) || "/"
      : normalizedPath;

  const docPrefix = "/doc";
  const newPath = "/new";
  const sharePrefix = "/s";

  const isRoot = strippedPath === "/" || strippedPath === "";
  const isDoc =
    strippedPath === docPrefix || strippedPath.startsWith(`${docPrefix}/`);
  const isNew = strippedPath === newPath;
  const isShare = strippedPath === sharePrefix || strippedPath.startsWith(`${sharePrefix}/`);

  // Hide sidebar on public share pages
  if (isShare) {
    return null;
  }

  // Show sidebar on root (dashboard), doc pages, and new page
  if (!isRoot && !isDoc && !isNew) {
    return null;
  }

  return <SidebarNav docs={docs} dashboardPath={dashboardPath} />;
}
