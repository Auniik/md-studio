import { useNavigate } from "@remix-run/react";
import { toast } from "sonner";

import { Editor } from "@/components/Editor";
import { withBasePath, useBasePath } from "@/lib/base-path";

type EditDocumentFormProps = {
  initialValues: {
    title: string;
    slug: string;
    bodyMd: string;
  };
  originalSlug: string;
};

type ActionResponse = {
  success?: boolean;
  slug?: string;
  error?: string;
};

export function EditDocumentForm({ initialValues, originalSlug }: EditDocumentFormProps) {
  const navigate = useNavigate();
  const { basePath } = useBasePath();

  const handleSubmit = async (values: { title: string; slug?: string; bodyMd: string }) => {
    const formData = new FormData();
    formData.append("originalSlug", originalSlug);
    formData.append("title", values.title);
    formData.append("slug", values.slug || "");
    formData.append("bodyMd", values.bodyMd);

    const response = await fetch(withBasePath("/api/update", basePath), {
      method: "POST",
      body: formData,
    });

    const data = (await response.json().catch(() => ({}))) as ActionResponse;

    if (!response.ok || data?.success === false) {
      const message = data?.error || `Update failed (${response.status})`;
      toast.error(message);
      throw new Error(message);
    }

    if (data?.slug) {
      navigate(withBasePath(`/doc/${data.slug}`, basePath));
    }
  };

  return (
    <Editor
      initialValues={initialValues}
      submitLabel="Save changes"
      successMessage="Document updated."
      onSubmit={handleSubmit}
    />
  );
}
