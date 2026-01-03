import { useNavigate } from "@remix-run/react";

import { Editor } from "@/components/Editor";
import { withBasePath, useBasePath } from "@/lib/base-path";

type ActionResponse = {
  success?: boolean;
  slug?: string;
  error?: string;
};

export function NewDocumentForm() {
  const navigate = useNavigate();
  const { basePath } = useBasePath();

  const handleSubmit = async (values: { title: string; slug?: string; bodyMd: string }) => {
    const formData = new FormData();
    formData.append("title", values.title);
    formData.append("slug", values.slug || "");
    formData.append("bodyMd", values.bodyMd);

    const response = await fetch(withBasePath("/api/create", basePath), {
      method: "post",
      body: formData,
    });
    const data = (await response.json()) as ActionResponse;

    if (data.success && data.slug) {
      try {
        const docResponse = await fetch(
          withBasePath(`/api/get?slug=${encodeURIComponent(data.slug)}`, basePath),
        );
        const docData = await docResponse.json();
        if (typeof window !== "undefined" && docData?.doc) {
          window.dispatchEvent(
            new CustomEvent("md-studio-docs-created", { detail: { doc: docData.doc } }),
          );
        }
      } catch (error) {
        void error;
      }
      navigate(withBasePath(`/doc/${data.slug}`, basePath));
      return;
    }

    throw new Error(data.error || "Failed to create document.");
  };

  return (
    <Editor
      submitLabel="Create document"
      successMessage="Document created."
      onSubmit={handleSubmit}
    />
  );
}
