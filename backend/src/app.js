const fs = require("fs");
const path = require("path");
const express = require("express");
const cors = require("cors");
const env = require("./config/env");
const routes = require("./routes");
const notFound = require("./middleware/notFound");
const errorHandler = require("./middleware/errorHandler");
const rateLimit = require("./middleware/rateLimit");
const seoService = require("./services/seo.service");
const analytics = require("./services/analytics.service");

const app = express();

// Trust the proxy so req.ip reflects the visitor rather than nginx or Fly's edge — the rate
// limiter is useless if every request looks like it came from the same address.
app.set("trust proxy", true);

app.use(cors({ origin: env.clientUrl }));
app.use(express.json());

// Applied to the API only. Page requests are cheap and cached-ish, while API calls hit the
// database, and a limit on HTML would risk throttling a crawler we actually want indexing us.
app.use("/api", rateLimit);
app.use("/api", routes);
// Scoped to /api so unknown *page* URLs can still fall through to the SPA below, while a typo
// in an API path still gets an honest 404 instead of a page of HTML.
app.use("/api", notFound);

app.get("/robots.txt", (req, res) => {
  res.type("text/plain").send(seoService.renderRobots());
});

app.get("/sitemap.xml", async (req, res, next) => {
  try {
    res.type("application/xml").send(await seoService.renderSitemap());
  } catch (error) {
    next(error);
  }
});

// In development the frontend is served by Vite on its own port, so there is no build to serve
// and this whole section stays dormant. In production the built app ships inside the same
// container: one process, one port, one origin — no CORS, and half the hosting bill.
const distDir = path.resolve(__dirname, "../../frontend/dist");
const shellPath = path.join(distDir, "index.html");

if (fs.existsSync(shellPath)) {
  // Hashed filenames mean these can be cached hard; the shell itself must never be, or visitors
  // keep seeing yesterday's rates baked into the server-rendered HTML.
  app.use(
    express.static(distDir, {
      index: false,
      maxAge: "1y",
      setHeaders(res, filePath) {
        if (filePath === shellPath) {
          res.setHeader("Cache-Control", "no-store");
        }
      }
    })
  );

  app.get("*", async (req, res, next) => {
    try {
      const shell = fs.readFileSync(shellPath, "utf8");
      const seo = await seoService.buildForRoute(req.path);
      res
        .status(seo.status || 200)
        .set("Cache-Control", "no-store")
        .type("html")
        .send(seoService.injectIntoShell(shell, seo));

      // After the response, and not awaited: the visitor should never wait on bookkeeping.
      // The admin panel is excluded because counting your own visits would drown the real ones,
      // and 404s are excluded so a broken link cannot inflate the traffic figures.
      if (!req.path.startsWith("/admin") && (seo.status || 200) === 200) {
        analytics.bump(analytics.METRICS.pageView, req.path);
      }
    } catch (error) {
      next(error);
    }
  });
} else {
  app.get("/", (req, res) => {
    res.type("text/plain").send(
      "Frontend build not found. Run `npm run build --prefix frontend`, or use the Vite dev server on port 5173."
    );
  });
}

app.use(errorHandler);

module.exports = app;
