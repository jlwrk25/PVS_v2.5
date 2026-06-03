import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import { Readable } from "stream";
import { createServer as createViteServer } from "vite";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware for parsing JSON requests
  app.use(express.json());

  // Google Drive Media Proxy route
  app.get("/api/media/:id", async (req, res) => {
    try {
      const id = req.params.id;
      const rangeHeader = req.headers.range;
      const token = (req.query.token as string) || req.headers.authorization?.split(" ")[1];

      const headers: Record<string, string> = {
        "User-Agent":
          "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
      };

      if (rangeHeader) {
        headers["Range"] = rangeHeader;
      }

      let driveUrl = `https://docs.google.com/uc?export=download&id=${id}&confirm=t`;
      if (token) {
        headers["Authorization"] = `Bearer ${token}`;
        driveUrl = `https://www.googleapis.com/drive/v3/files/${id}?alt=media`;
      }

      const googleRes = await fetch(driveUrl, { headers });

      const status = googleRes.status;
      const contentType = googleRes.headers.get("content-type") || "application/octet-stream";
      const contentLength = googleRes.headers.get("content-length");
      const contentRange = googleRes.headers.get("content-range");
      const acceptRanges = googleRes.headers.get("accept-ranges");

      // Set response headers to match what Google specifies (or fallback)
      res.status(status);
      res.setHeader("Content-Type", contentType);
      
      if (contentLength) res.setHeader("Content-Length", contentLength);
      if (contentRange) res.setHeader("Content-Range", contentRange);
      if (acceptRanges) res.setHeader("Accept-Ranges", acceptRanges);

      // Support full CORS for direct video players
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Range, Content-Type, Content-Length");

      // Handle HEAD requests easily
      if (req.method === "OPTIONS" || req.method === "HEAD") {
        return res.end();
      }

      if (!googleRes.body) {
        return res.end();
      }

      // Convert Web ReadableStream to Node.js Readable stream and pipe to response
      const readable = Readable.fromWeb(googleRes.body as any);
      readable.pipe(res);
    } catch (error) {
      console.error("Error proxying Google Drive media stream:", error);
      if (!res.headersSent) {
        res.status(500).send("Failed to stream media from Google Drive");
      }
    }
  });

  // Vite development middleware vs Static Production build serving
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server successfully started on http://0.0.0.0:${PORT}`);
  });
}

startServer();
