import React, { useState, useCallback } from 'react';
import { analyzeVideoContent } from '../services/geminiService';
import { fileToBase64 } from '../utils/fileUtils';
import Loader from './Loader';

const VideoAnalyzer: React.FC = () => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoPreview, setVideoPreview] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('この動画の主要な出来事を要約してください。主なトピックは何ですか？');
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setVideoFile(file);
      setAnalysis(null);
      const reader = new FileReader();
      reader.onloadend = () => setVideoPreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleAnalyze = useCallback(async () => {
    if (!videoFile || !prompt) {
      setError('動画をアップロードし、プロンプトを入力してください。');
      return;
    }
    setIsLoading(true);
    setError(null);
    setAnalysis(null);
    try {
      // NOTE: Real video understanding requires frame extraction. This service simulates it
      // by sending the entire video file. Gemini Pro is powerful but this is a simplified approach.
      const base64Video = await fileToBase64(videoFile);
      const result = await analyzeVideoContent(prompt, base64Video, videoFile.type);
      setAnalysis(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : '分析中に不明なエラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  }, [videoFile, prompt]);

  return (
    <div className="space-y-6">
      <div className="p-6 bg-gray-800/50 rounded-xl border border-gray-700/50">
        <h2 className="text-2xl font-bold mb-2">動画コンテンツ分析</h2>
        <p className="text-sm text-gray-500 mb-4">注：このツールはGemini Proを使用して動画コンテンツを分析します。フロントエンドの制限により、ファイル全体が分析のために送信されるため、短いクリップに最適です。</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-300 mb-1">1. 動画をアップロード</label>
              <input type="file" accept="video/*" onChange={handleFileChange} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600/20 file:text-blue-300 hover:file:bg-blue-600/40 cursor-pointer"/>
            </div>
            {videoPreview && (
              <video controls src={videoPreview} className="w-full rounded-lg" />
            )}
          </div>
          <div className="space-y-4">
            <div>
              <label htmlFor="video-prompt" className="block text-sm font-medium text-gray-300 mb-1">2. 何を分析しますか？</label>
              <textarea
                id="video-prompt"
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                className="w-full h-32 bg-gray-700 border border-gray-600 rounded-md p-2 focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <button onClick={handleAnalyze} disabled={isLoading || !videoFile} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800/50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-md transition">
              {isLoading ? '分析中...' : '動画を分析'}
            </button>
          </div>
        </div>
      </div>
      
      {isLoading && <Loader message="動画を分析中です。これには少し時間がかかる場合があります..." />}
      {error && <div className="p-4 bg-red-900/50 text-red-200 border border-red-700 rounded-md">{error}</div>}
      
      {analysis && (
        <div className="p-6 bg-gray-800/50 rounded-xl border border-gray-700/50">
          <h3 className="text-xl font-semibold mb-3">分析結果</h3>
          <div className="prose prose-invert max-w-none whitespace-pre-wrap">{analysis}</div>
        </div>
      )}
    </div>
  );
};

export default VideoAnalyzer;