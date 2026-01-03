import { RemixBrowser } from "@remix-run/react";
import { startTransition, StrictMode } from "react";
import { createRoot, hydrateRoot } from "react-dom/client";

const isSpaMode =
  typeof window !== "undefined" && (window as any).__remixContext?.isSpaMode;

startTransition(() => {
  if (isSpaMode) {
    createRoot(document as unknown as Element).render(
      <StrictMode>
        <RemixBrowser />
      </StrictMode>
    );
    return;
  }

  hydrateRoot(
    document,
    <StrictMode>
      <RemixBrowser />
    </StrictMode>
  );
});
