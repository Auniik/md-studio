import { vitePlugin as remix } from "@remix-run/dev";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ command }) => {
  const isBuild = command === "build";
  const basePathPlaceholder = "/__BASE_PATH__";

  return {
    base: isBuild ? `${basePathPlaceholder}/` : "/",
    plugins: [
      remix({
        ssr: false,
        basename: isBuild ? basePathPlaceholder : "/",
        future: {
          v3_fetcherPersist: true,
          v3_relativeSplatPath: true,
          v3_throwAbortReason: true,
          v3_singleFetch: true,
          v3_lazyRouteDiscovery: true,
        },
      }),
      tsconfigPaths(),
    ],
    server: {
      port: 3000,
      host: true,
      hmr: false,
    },
    build: {
      target: "ES2022",
      outDir: "build",
    },
    optimizeDeps: {
      include: [
        // React core
        "react",
        "react-dom",
        "react/jsx-runtime",
        "react/jsx-dev-runtime",
        "react-dom/client",
        // Remix
        "@remix-run/react",
        // UI dependencies that get discovered late
        "marked",
        "isomorphic-dompurify",
        "highlight.js",
        "sonner",
        "clsx",
        "tailwind-merge",
        "class-variance-authority",
        // Radix UI
        "@radix-ui/react-dialog",
        "@radix-ui/react-dropdown-menu",
        "@radix-ui/react-tooltip",
        "@radix-ui/react-popover",
        "@radix-ui/react-select",
        "@radix-ui/react-checkbox",
        "@radix-ui/react-slot",
        // Lucide icons
        "lucide-react",
      ],
    },
    resolve: {
      dedupe: ["react", "react-dom", "react/jsx-runtime", "react/jsx-dev-runtime"],
    },
  };
});
