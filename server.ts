import express from "express";
import path from "path";
import fs from "fs";
import { Readable } from "stream";
import { createServer as createViteServer } from "vite";

// Load Google API Key from Firebase client config if available
let googleApiKey = "";
try {
  const configPath = path.resolve(process.cwd(), "firebase-applet-config.json");
  if (fs.existsSync(configPath)) {
    const config = JSON.parse(fs.readFileSync(configPath, "utf8"));
    googleApiKey = config.apiKey || "";
  }
} catch (error) {
  console.error("Failed to load firebase apiKey for Google Drive fallback:", error);
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000; // Added process.env.PORT to allow Render to assign the port dynamically

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

      let googleRes: Response;

      if (token) {
        // If we have an OAuth token, we can stream directly from GDrive REST API
        headers["Authorization"] = `Bearer ${token}`;
        const driveUrl = `https://www.googleapis.com/drive/v3/files/${id}?alt=media`;
        googleRes = await fetch(driveUrl, { headers });
      } else if (googleApiKey) {
        // Public files can be fetched officially from GDrive REST API with our Firebase-associated Google API key
        // This is extremely robust, bypassing any datacentre restrictions or virus scan interstitials!
        const driveUrl = `https://www.googleapis.com/drive/v3/files/${id}?alt=media&key=${googleApiKey}`;
        googleRes = await fetch(driveUrl, { headers });

        if (!googleRes.ok) {
          console.warn(`Drive Media Proxy API fetch failed with status ${googleRes.status}. Falling back to uc link...`);
          const initialUrl = `https://docs.google.com/uc?export=download&id=${id}`;
          googleRes = await fetch(initialUrl, { headers });
        }
      } else {
        // Public file access fallback
        const initialUrl = `https://docs.google.com/uc?export=download&id=${id}`;
        googleRes = await fetch(initialUrl, { headers });
      }

      const contentType = googleRes.headers.get("content-type") || "";

      // Large files trigger a "can't scan for viruses" warning page in HTML
      if (contentType.includes("text/html")) {
        const html = await googleRes.text();

        // Extract confirmation token from warning HTML
        let confirmToken = "";
        const confirmMatch = html.match(/confirm=([a-zA-Z0-9_-]+)/i);
        if (confirmMatch) {
          confirmToken = confirmMatch[1];
        } else {
          const nameConfirmMatch = html.match(/name="confirm"[^>]*?value="([a-zA-Z0-9_-]+)"/i) ||
                                   html.match(/value="([a-zA-Z0-9_-]+)"[^>]*?name="confirm"/i);
          if (nameConfirmMatch) {
            confirmToken = nameConfirmMatch[1];
          }
        }

        if (confirmToken) {
          // Google Drive requires back-sending any warnings cookies that were sent
          const setCookies = googleRes.headers.getSetCookie 
            ? googleRes.headers.getSetCookie() 
            : (googleRes.headers.get("set-cookie") ? [googleRes.headers.get("set-cookie")!] : []);
          
          const cookiesList = setCookies.map(cookie => cookie.split(";")[0]);
          const cookieHeader = cookiesList.join("; ");

          const finalUrl = `https://docs.google.com/uc?export=download&id=${id}&confirm=${confirmToken}`;
          const finalHeaders: Record<string, string> = { ...headers };
          if (cookieHeader) {
            finalHeaders["Cookie"] = cookieHeader;
          }

          googleRes = await fetch(finalUrl, { headers: finalHeaders });
        } else {
          console.warn(`Drive Media Proxy: HTML page returned for ID ${id} but no confirm token found.`);
        }
      }

      const status = googleRes.status;
      const responseContentType = googleRes.headers.get("content-type") || "application/octet-stream";
      const contentLength = googleRes.headers.get("content-length");
      const contentRange = googleRes.headers.get("content-range");
      const acceptRanges = googleRes.headers.get("accept-ranges");

      // Set response headers to match what Google specifies (or fallback)
      res.status(status);
      res.setHeader("Content-Type", responseContentType);
      
      if (contentLength) res.setHeader("Content-Length", contentLength);
      if (contentRange) res.setHeader("Content-Range", contentRange);
      if (acceptRanges) res.setHeader("Accept-Ranges", acceptRanges);

      // Support full CORS for direct video players
      res.setHeader("Access-Control-Allow-Origin", "*");
      res.setHeader("Access-Control-Allow-Methods", "GET, HEAD, OPTIONS");
      res.setHeader("Access-Control-Allow-Headers", "Range, Content-Type, Content-Length");

      // Handle HEAD/OPTIONS requests
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
    console.log(`Server successfully started on port ${PORT}`);
  });
}

startServer();
