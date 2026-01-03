import type { MetaFunction } from "@remix-run/react";

import { NewDocumentForm } from "@/components/NewDocumentForm";
import { Breadcrumb } from "@/components/Breadcrumb";
import { useBasePath } from "@/lib/base-path";

export const meta: MetaFunction = () => {
  return [{ title: "New Document | md-studio" }];
};

export default function NewDocumentPage() {
  const { dashboardPath } = useBasePath();

  return (
    <main className="flex flex-col gap-6">
      <Breadcrumb items={[{ label: "New document" }]} dashboardPath={dashboardPath} />
      <NewDocumentForm />
    </main>
  );
}
