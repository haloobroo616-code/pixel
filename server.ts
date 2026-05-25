import express from "express";
import path from "node:path";
import { createServer as createViteServer } from "vite";
import multer from "multer";
import sharp from "sharp";

const app = express();
const PORT = 3000;

// Multer in-memory storage config
const storage = multer.memoryStorage();
const upload = multer({ storage });

function getBlock(level: number) {
  return Math.min(Math.max(Number(level) || 12, 1), 40);
}

// API Route for pixelating image
app.post("/api/pixelate", upload.single("image"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "No image file provided" });
    }

    const pixelLevel = req.body.pixelLevel ? parseInt(req.body.pixelLevel, 10) : 30;
    const block = getBlock(pixelLevel);

    // Read the file buffer
    const image = sharp(req.file.buffer, { limitInputPixels: false }).rotate().ensureAlpha();
    const meta = await image.metadata();

    if (!meta.width || !meta.height) {
      return res.status(400).json({ error: "Invalid image metadata" });
    }

    const width = meta.width;
    const height = meta.height;

    const input = await image.raw().toBuffer();
    const output = Buffer.alloc(input.length);

    for (let y = 0; y < height; y += block) {
      for (let x = 0; x < width; x += block) {
        let r = 0;
        let g = 0;
        let b = 0;
        let a = 0;
        let count = 0;

        const maxY = Math.min(y + block, height);
        const maxX = Math.min(x + block, width);

        for (let yy = y; yy < maxY; yy++) {
          for (let xx = x; xx < maxX; xx++) {
            const i = (yy * width + xx) * 4;
            r += input[i];
            g += input[i + 1];
            b += input[i + 2];
            a += input[i + 3];
            count++;
          }
        }

        r = Math.round(r / count);
        g = Math.round(g / count);
        b = Math.round(b / count);
        a = Math.round(a / count);

        for (let yy = y; yy < maxY; yy++) {
          for (let xx = x; xx < maxX; xx++) {
            const i = (yy * width + xx) * 4;
            output[i] = r;
            output[i + 1] = g;
            output[i + 2] = b;
            output[i + 3] = a;
          }
        }
      }
    }

    const outputBuffer = await sharp(output, {
      raw: {
        width,
        height,
        channels: 4
      }
    })
      .png({
        compressionLevel: 9,
        adaptiveFiltering: false
      })
      .toBuffer();

    res.set("Content-Type", "image/png");
    res.send(outputBuffer);
  } catch (error) {
    console.error("Error processing image:", error);
    res.status(500).json({ error: "Failed to process image" });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Note: express.static needs to reference the absolute dist path appropriately
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
