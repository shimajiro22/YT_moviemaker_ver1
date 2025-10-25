import React, { useState } from "react";

const YouTubeAnalyzer: React.FC = () => {
  const [input, setInput] = useState("マーケ×AIの60秒台本を作って");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string>("");

  const callServer = async () => {
    try {
      setLoading(true);
      setResult("");
      const res = await fetch("/api/run", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt: input }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`HTTP ${res.status}: ${text}`);
      }
      const data = await res.json(); // { text: string }
      setResult(data.text ?? "(no text)");
    } catch (e: any) {
      setResult("Error: " + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-3xl">
      <h2 className="text-xl font-semibold mb-3">疎通テスト：/api/run</h2>
      <p className="text-sm text-gray-400 mb-4">
        入力 → 「生成」を押すと、サーバ経由でGeminiに問い合わせます（APIキーはサーバ側）。
      </p>
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        rows={5}
        className="w-full p-3 rounded-lg bg-gray-800 text-gray-100 outline-none"
      />
      <div className="mt-3 flex items-center gap-2">
        <button
          onClick={callServer}
          disabled={loading}
          className="px-4 py-2 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-60"
        >
          {loading ? "生成中…" : "生成"}
        </button>
        <span className="text-xs text-gray-400">（Networkタブで /api/run を確認できます）</span>
      </div>
      {result && (
        <pre className="mt-4 whitespace-pre-wrap p-3 bg-gray-800 rounded-lg">
{result}
        </pre>
      )}
    </div>
  );
};

export default YouTubeAnalyzer;
