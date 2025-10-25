// server.js —— Node20 + Express（ESM）最小構成
import express from "express";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();

app.use(express.json());

// dist（Viteのビルド成果物）を配信
app.use(express.static("dist"));

/** Gemini をサーバ側から呼ぶ安全なAPI */
app.post("/api/run", async (req, res) => {
  try {
    const { prompt } = req.body ?? {};
    if (!prompt) return res.status(400).json({ error: "prompt is required" });

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return res.status(500).json({ error: "GEMINI_API_KEY not set" });

    const r = await fetch(
      "https://generativelanguage.googleapis.com/v1/models/gemini-1.5-flash:generateContent?key=" + apiKey,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }]}],
          generationConfig: { temperature: 0.8, topP: 0.9 }
        })
      }
    );

    const data = await r.json();
    const text = data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
    return res.json({ text });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ error: "internal_error" });
  }
});

// SPA ルーティング（ReactのどのURLでも index.html を返す）
app.get("*", (_req, res) => {
  res.sendFile(path.join(__dirname, "dist", "index.html"));
});

const port = process.env.PORT || 8080;
app.listen(port, () => console.log("✅ server on", port));
