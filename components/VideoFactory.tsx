import React, { useState, useCallback, useEffect } from 'react';
import { generateVideoFromText, generateVideoFromImage } from '../services/geminiService';
import { fileToBase64 } from '../utils/fileUtils';
import { AspectRatio } from '../types';
import Loader from './Loader';

type VideoMode = 'text-to-video' | 'image-to-video';

const loadingMessages = [
  "仮想カメラをウォームアップ中...",
  "ピクセルを調整中...",
  "映画のような魔法をレンダリング中...",
  "これには数分かかる場合があります。しばらくお待ちください。",
  "もうすぐです、最後の仕上げを追加しています...",
  "シーンを合成中...",
];

const VideoFactory: React.FC = () => {
  const [mode, setMode] = useState<VideoMode>('text-to-video');
  const [prompt, setPrompt] = useState<string>('雪に覆われた山脈の上を舞う雄大な鷲、シネマティック4K');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('16:9');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [loadingMessage, setLoadingMessage] = useState<string>(loadingMessages[0]);
  const [error, setError] = useState<string | null>(null);
  
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [generatedVideoUrl, setGeneratedVideoUrl] = useState<string | null>(null);

  const [isApiKeyReady, setIsApiKeyReady] = useState(false);

  useEffect(() => {
    let interval: number;
    if (isLoading) {
      let i = 0;
      interval = window.setInterval(() => {
        i = (i + 1) % loadingMessages.length;
        setLoadingMessage(loadingMessages[i]);
      }, 5000);
    }
    return () => clearInterval(interval);
  }, [isLoading]);

  useEffect(() => {
    const checkApiKey = async () => {
        if (window.aistudio && typeof window.aistudio.hasSelectedApiKey === 'function') {
            const hasKey = await window.aistudio.hasSelectedApiKey();
            setIsApiKeyReady(hasKey);
        } else {
            console.warn("aistudio SDK not found. Assuming key is set via environment for local dev.");
            setIsApiKeyReady(true); // For local dev without the SDK
        }
    };
    checkApiKey();
  }, []);

  const handleSelectKey = async () => {
    if (window.aistudio && typeof window.aistudio.openSelectKey === 'function') {
        await window.aistudio.openSelectKey();
        // Assume success and optimistically update UI
        setIsApiKeyReady(true);
    } else {
        alert("APIキー選択ダイアログはこの環境では利用できません。");
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setGeneratedVideoUrl(null);
    setLoadingMessage(loadingMessages[0]);
    
    try {
        // Re-check key right before the call
        if (window.aistudio && !(await window.aistudio.hasSelectedApiKey())) {
            setIsApiKeyReady(false);
            throw new Error("APIキーが選択されていません。続行するにはAPIキーを選択してください。");
        }
        
        let videoUrl: string;
        if (mode === 'image-to-video') {
            if (!imageFile) throw new Error("画像から動画を生成するには、画像をアップロードしてください。");
            const base64Image = await fileToBase64(imageFile);
            videoUrl = await generateVideoFromImage(prompt, base64Image, imageFile.type, aspectRatio);
        } else {
            if (!prompt) throw new Error("テキストから動画を生成するには、プロンプトを入力してください。");
            videoUrl = await generateVideoFromText(prompt, aspectRatio);
        }
        setGeneratedVideoUrl(videoUrl);
    } catch (err) {
        const errorMessage = err instanceof Error ? err.message : '不明なエラーが発生しました。';
        if (errorMessage.includes("Requested entity was not found.")) {
             setError("APIキーが無効のようです。有効なキーを選択してください。");
             setIsApiKeyReady(false);
        } else {
            setError(errorMessage);
        }
    } finally {
        setIsLoading(false);
    }
  }, [prompt, aspectRatio, mode, imageFile]);

  if (!isApiKeyReady) {
    return (
        <div className="flex flex-col items-center justify-center h-full p-6 bg-gray-800/50 rounded-xl border border-gray-700/50">
            <h2 className="text-2xl font-bold mb-4 text-white">VeoにはAPIキーが必要です</h2>
            <p className="text-gray-400 mb-6 text-center max-w-md">Veoでの動画生成には、Google AI StudioのAPIキーが必要です。続行するにはキーを選択してください。ダイアログが開いてキーを選択できます。</p>
            <p className="text-sm text-gray-500 mb-6">課金の詳細については、<a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">ai.google.dev/gemini-api/docs/billing</a> を参照してください。</p>
            <button onClick={handleSelectKey} className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-6 rounded-md transition duration-300">
                APIキーを選択
            </button>
        </div>
    );
  }

  return (
    <div className="space-y-6">
        <div className="flex justify-center p-1 bg-gray-800/50 rounded-lg border border-gray-700/50 w-fit mx-auto">
            <button onClick={() => setMode('text-to-video')} className={`px-4 py-2 text-sm font-medium rounded-md transition ${mode === 'text-to-video' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700/50'}`}>テキストから動画へ</button>
            <button onClick={() => setMode('image-to-video')} className={`px-4 py-2 text-sm font-medium rounded-md transition ${mode === 'image-to-video' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700/50'}`}>画像から動画へ</button>
        </div>

        <div className="p-6 bg-gray-800/50 rounded-xl border border-gray-700/50">
            <h2 className="text-2xl font-bold mb-4">{mode === 'text-to-video' ? 'テキストからの動画生成' : '画像からの動画生成'}</h2>
            
            {mode === 'image-to-video' && (
                <div className="mb-4">
                    <label className="block text-sm font-medium text-gray-300 mb-1">開始画像</label>
                    <input type="file" accept="image/*" onChange={handleFileChange} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600/20 file:text-blue-300 hover:file:bg-blue-600/40 cursor-pointer"/>
                    {imagePreview && <img src={imagePreview} alt="Preview" className="mt-4 rounded-lg max-h-40"/>}
                </div>
            )}

            <div className="mb-4">
                <label htmlFor="prompt" className="block text-sm font-medium text-gray-300 mb-1">プロンプト</label>
                <textarea id="prompt" value={prompt} onChange={e => setPrompt(e.target.value)} className="w-full h-24 bg-gray-700 border border-gray-600 rounded-md p-2 focus:ring-2 focus:ring-blue-500"/>
            </div>

            <div className="mb-4">
                <label className="block text-sm font-medium text-gray-300 mb-1">アスペクト比</label>
                <div className="flex gap-2">
                    <button onClick={() => setAspectRatio('16:9')} className={`px-4 py-2 rounded-md transition ${aspectRatio === '16:9' ? 'bg-blue-600' : 'bg-gray-700'}`}>16:9 (横長)</button>
                    <button onClick={() => setAspectRatio('9:16')} className={`px-4 py-2 rounded-md transition ${aspectRatio === '9:16' ? 'bg-blue-600' : 'bg-gray-700'}`}>9:16 (縦長)</button>
                </div>
            </div>

            <button onClick={handleSubmit} disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800/50 text-white font-bold py-3 rounded-md transition">
                {isLoading ? '動画を生成中...' : '動画を生成'}
            </button>
        </div>

        {isLoading && <Loader message={loadingMessage} />}
        {error && <div className="p-4 bg-red-900/50 text-red-200 border border-red-700 rounded-md">{error}</div>}
        
        {generatedVideoUrl && (
            <div className="p-6 bg-gray-800/50 rounded-xl border border-gray-700/50">
                <h3 className="text-xl font-semibold mb-3">生成された動画</h3>
                <video controls src={generatedVideoUrl} className="w-full rounded-lg" />
            </div>
        )}
    </div>
  );
};

export default VideoFactory;