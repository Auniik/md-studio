import type { MetaFunction } from "@remix-run/react";
import { useParams } from "@remix-run/react";
import { useEffect, useState } from "react";

import { withBasePath, useBasePath } from "@/lib/base-path";
import { EditDocumentForm } from "@/components/EditDocumentForm";
import { Breadcrumb } from "@/components/Breadcrumb";

export const meta: MetaFunction = () => {
  return [{ title: "Edit Document | md-studio" }];
};

export default function EditDocPage() {
  const { slug } = useParams();
  const { basePath, dashboardPath } = useBasePath();
  const [doc, setDoc] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    if (!slug) return;
    fetch(withBasePath(`/api/get?slug=${encodeURIComponent(slug)}`, basePath))
      .then(res => res.json())
      .then(data => {
        if (data?.doc) {
          setDoc(data.doc);
        }
        setLoading(false);
      })
      .catch(err => {
        console.error("Failed to load document:", err);
        setLoading(false);
      });
  }, [slug]);
  
  if (loading || !doc) {
    return <div className="p-8">Loading...</div>;
  }
  return (
    <main className="flex flex-col gap-6">
      <Breadcrumb
        items={[
          { label: doc.title, href: withBasePath(`/doc/${doc.slug}`, basePath) },
          { label: "Edit" },
        ]}
        dashboardPath={dashboardPath}
      />
      <EditDocumentForm
        initialValues={{
          title: doc.title,
          slug: doc.slug,
          bodyMd: doc.bodyMd,
        }}
        originalSlug={doc.slug}
      />
    </main>
  );
}
