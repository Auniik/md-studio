import { createRequestHandler } from "@remix-run/express";
import express, { Router } from "express";
import path from "path";

const PORT = process.env.PORT || 3000;
const BASE_PATH = (process.env.BASE_PATH || "/").replace(/\/+$/, "") || "/";
const isProduction = process.env.NODE_ENV === "production";

const app = express();

async function startServer() {
  let build: unknown;

  if (isProduction) {
    build = await import("./build/server/index.js");
    
    // Serve static assets at root level so they work regardless of BASE_PATH
    app.use(
      "/assets",
      express.static(path.join(process.cwd(), "build/client/assets"), {
        immutable: true,
        maxAge: "1y",
      })
    );

    app.use(
      "/uploads",
      express.static(path.join(process.cwd(), "public/uploads"), {
        maxAge: "1d",
      })
    );
    
    const prodRouter = Router();
    
    prodRouter.use(
      "/assets",
      express.static(path.join(process.cwd(), "build/client/assets"), {
        immutable: true,
        maxAge: "1y",
      })
    );

    prodRouter.use(
      express.static(path.join(process.cwd(), "build/client"), {
        maxAge: "1h",
      })
    );

    prodRouter.use(
      "/uploads",
      express.static(path.join(process.cwd(), "public/uploads"), {
        maxAge: "1d",
      })
    );

    prodRouter.all(
      "*",
      createRequestHandler({
        build: build as never,
        mode: "production",
        getLoadContext: () => ({ basePath: BASE_PATH }),
      })
    );

    app.use(BASE_PATH, prodRouter);

    if (BASE_PATH !== "/") {
      app.get("/", (_req, res) => res.redirect(BASE_PATH));
    }
  } else {
    const vite = await import("vite");
    const viteDevServer = await vite.createServer({
      server: { middlewareMode: true },
    });

    app.use(viteDevServer.middlewares);

    app.use(
      "/uploads",
      express.static(path.join(process.cwd(), "public/uploads"))
    );

    build = () => viteDevServer.ssrLoadModule("virtual:remix/server-build");

    app.all(
      "*",
      createRequestHandler({
        build: build as never,
        mode: "development",
        getLoadContext: () => ({ basePath: "/" }),
      })
    );
  }

  app.listen(PORT, () => {
    const effectivePath = isProduction ? BASE_PATH : "/";
    console.log(`Server running at http://localhost:${PORT}${effectivePath}`);
    if (!isProduction && BASE_PATH !== "/") {
      console.log(`Note: BASE_PATH=${BASE_PATH} will be applied in production builds.`);
    }
  });
}

startServer();
