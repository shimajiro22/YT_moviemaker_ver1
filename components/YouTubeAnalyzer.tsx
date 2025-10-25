import React, { useState, useCallback } from 'react';
import { analyzeYoutubeTrends, generateScriptAndPrompt } from '../services/geminiService';
import Loader from './Loader';

const YouTubeAnalyzer: React.FC = () => {
  const [topic, setTopic] = useState<string>('Z世代向けのパーソナルファイナンス');
  const [period, setPeriod] = useState<string>('過去1ヶ月');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  const [videoIdeas, setVideoIdeas] = useState<string | null>(null);
  const [trendAnalysis, setTrendAnalysis] = useState<string | null>(null);
  const [generatedScript, setGeneratedScript] = useState<string | null>(null);
  const [veoPrompt, setVeoPrompt] = useState<string | null>(null);

  const handleAnalyze = useCallback(async () => {
    if (!topic) {
      setError('トピックを入力してください。');
      return;
    }
    setIsLoading(true);
    setError(null);
    setVideoIdeas(null);
    setTrendAnalysis(null);
    setGeneratedScript(null);
    setVeoPrompt(null);

    try {
      const analysisResult = await analyzeYoutubeTrends(topic, period);
      setVideoIdeas(analysisResult.videoIdeas);
      setTrendAnalysis(analysisResult.trendAnalysis);

      if (analysisResult.trendAnalysis) {
        const scriptResult = await generateScriptAndPrompt(analysisResult.trendAnalysis);
        setGeneratedScript(scriptResult.script);
        setVeoPrompt(scriptResult.veoPrompt);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  }, [topic, period]);
  
  const copyToClipboard = (text: string | null) => {
    if (text) {
      navigator.clipboard.writeText(text);
      alert('クリップボードにコピーしました！');
    }
  };

  return (
    <div className="space-y-6">
      <div className="p-6 bg-gray-800/50 rounded-xl border border-gray-700/50">
        <h2 className="text-2xl font-bold mb-4 text-white">YouTubeトレンド分析 & 台本生成</h2>
        <p className="text-gray-400 mb-6">トピックを入力して、トレンドの動画アイデアを発見し、市場分析を行い、バイラルなショート動画用の台本とVeoプロンプトを生成します。</p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div className="md:col-span-2">
            <label htmlFor="topic" className="block text-sm font-medium text-gray-300 mb-1">トピック / ジャンル</label>
            <input
              type="text"
              id="topic"
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="例：AIガジェット"
              className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            />
          </div>
          <div>
            <label htmlFor="period" className="block text-sm font-medium text-gray-300 mb-1">期間</label>
            <select
              id="period"
              value={period}
              onChange={(e) => setPeriod(e.target.value)}
              className="w-full bg-gray-700 border border-gray-600 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            >
              <option>過去1週間</option>
              <option>過去1ヶ月</option>
              <option>過去3ヶ月</option>
            </select>
          </div>
        </div>
        
        <button
          onClick={handleAnalyze}
          disabled={isLoading}
          className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800/50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-md transition duration-300"
        >
          {isLoading ? '分析中...' : 'トレンドを分析'}
        </button>
      </div>

      {isLoading && <Loader message="トレンドを分析し、コンテンツを生成しています..." />}
      {error && <div className="p-4 bg-red-900/50 text-red-200 border border-red-700 rounded-md">{error}</div>}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {videoIdeas && (
          <div className="p-6 bg-gray-800/50 rounded-xl border border-gray-700/50">
            <h3 className="text-xl font-semibold mb-3">人気の動画アイデア</h3>
            <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: videoIdeas }} />
          </div>
        )}
        {trendAnalysis && (
          <div className="p-6 bg-gray-800/50 rounded-xl border border-gray-700/50">
            <h3 className="text-xl font-semibold mb-3">トレンド分析</h3>
            <div className="prose prose-invert prose-sm max-w-none whitespace-pre-wrap" dangerouslySetInnerHTML={{ __html: trendAnalysis }} />
          </div>
        )}
        {generatedScript && (
          <div className="p-6 bg-gray-800/50 rounded-xl border border-gray-700/50 lg:col-span-2">
            <h3 className="text-xl font-semibold mb-3">生成された台本</h3>
            <textarea
              readOnly
              value={generatedScript}
              className="w-full h-64 bg-gray-900/70 border border-gray-600 rounded-md p-3 text-sm font-mono"
            ></textarea>
          </div>
        )}
        {veoPrompt && (
          <div className="p-6 bg-gray-800/50 rounded-xl border border-gray-700/50 lg:col-span-2">
            <h3 className="text-xl font-semibold mb-3">生成されたVeoプロンプト</h3>
             <div className="relative">
              <textarea
                readOnly
                value={veoPrompt}
                className="w-full h-32 bg-gray-900/70 border border-gray-600 rounded-md p-3 text-sm font-mono"
              ></textarea>
              <button onClick={() => copyToClipboard(veoPrompt)} className="absolute top-2 right-2 bg-gray-600 hover:bg-gray-500 text-white p-2 rounded-md text-xs">コピー</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default YouTubeAnalyzer;