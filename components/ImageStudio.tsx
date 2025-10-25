import React, { useState, useCallback } from 'react';
import { generateImage, editImage } from '../services/geminiService';
import { fileToBase64 } from '../utils/fileUtils';
import Loader from './Loader';

type StudioMode = 'generate' | 'edit';

const ImageStudio: React.FC = () => {
  const [mode, setMode] = useState<StudioMode>('generate');
  const [prompt, setPrompt] = useState<string>('小さな魔法使いの帽子をかぶった猫の超リアルな写真');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  
  // Generation state
  const [generatedImage, setGeneratedImage] = useState<string | null>(null);
  
  // Editing state
  const [originalImage, setOriginalImage] = useState<File | null>(null);
  const [originalImagePreview, setOriginalImagePreview] = useState<string | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [editPrompt, setEditPrompt] = useState<string>('レトロなビンテージフィルターを追加');

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setOriginalImage(file);
      setEditedImage(null);
      const reader = new FileReader();
      reader.onloadend = () => {
        setOriginalImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleGenerate = useCallback(async () => {
    if (!prompt) {
      setError('プロンプトを入力してください。');
      return;
    }
    setIsLoading(true);
    setError(null);
    setGeneratedImage(null);
    try {
      const imageUrl = await generateImage(prompt);
      setGeneratedImage(imageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  }, [prompt]);

  const handleEdit = useCallback(async () => {
    if (!editPrompt || !originalImage) {
      setError('画像をアップロードし、編集プロンプトを入力してください。');
      return;
    }
    setIsLoading(true);
    setError(null);
    setEditedImage(null);
    try {
      const base64Image = await fileToBase64(originalImage);
      const editedImageUrl = await editImage(editPrompt, base64Image, originalImage.type);
      setEditedImage(editedImageUrl);
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  }, [editPrompt, originalImage]);
  
  return (
    <div className="space-y-6">
      <div className="flex justify-center p-1 bg-gray-800/50 rounded-lg border border-gray-700/50 w-fit mx-auto">
        <button onClick={() => setMode('generate')} className={`px-4 py-2 text-sm font-medium rounded-md transition ${mode === 'generate' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700/50'}`}>画像生成</button>
        <button onClick={() => setMode('edit')} className={`px-4 py-2 text-sm font-medium rounded-md transition ${mode === 'edit' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700/50'}`}>画像編集</button>
      </div>

      {mode === 'generate' && (
        <div className="p-6 bg-gray-800/50 rounded-xl border border-gray-700/50">
          <h2 className="text-2xl font-bold mb-4">画像生成</h2>
          <div className="space-y-4">
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="画像を生成するためのプロンプトを入力してください..."
              className="w-full h-24 bg-gray-700 border border-gray-600 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
            />
            <button onClick={handleGenerate} disabled={isLoading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800/50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-md transition">
              {isLoading ? '生成中...' : '生成'}
            </button>
          </div>
          {isLoading && <div className="mt-6"><Loader message="画像を生成しています..." /></div>}
          {error && <div className="mt-4 p-4 bg-red-900/50 text-red-200 border border-red-700 rounded-md">{error}</div>}
          {generatedImage && (
            <div className="mt-6">
              <h3 className="text-xl font-semibold mb-3">生成された画像</h3>
              <img src={generatedImage} alt="Generated" className="rounded-lg max-w-full mx-auto" style={{maxHeight: '60vh'}}/>
            </div>
          )}
        </div>
      )}

      {mode === 'edit' && (
        <div className="p-6 bg-gray-800/50 rounded-xl border border-gray-700/50">
          <h2 className="text-2xl font-bold mb-4">画像編集</h2>
           <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                  <h3 className="text-lg font-semibold mb-2">1. 画像をアップロード</h3>
                  <input type="file" accept="image/*" onChange={handleFileChange} className="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-600/20 file:text-blue-300 hover:file:bg-blue-600/40 cursor-pointer"/>
                  {originalImagePreview && (
                    <div className="mt-4 border-2 border-dashed border-gray-600 rounded-lg p-2">
                      <img src={originalImagePreview} alt="Original" className="rounded-md w-full" />
                    </div>
                  )}
              </div>
              <div className="space-y-4">
                  <h3 className="text-lg font-semibold mb-2">2. 編集内容を記述</h3>
                  <textarea
                    value={editPrompt}
                    onChange={(e) => setEditPrompt(e.target.value)}
                    placeholder="例：白黒にする"
                    className="w-full h-24 bg-gray-700 border border-gray-600 rounded-md p-2 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition"
                  />
                  <button onClick={handleEdit} disabled={isLoading || !originalImage} className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800/50 disabled:cursor-not-allowed text-white font-bold py-3 px-4 rounded-md transition">
                    {isLoading ? '編集中...' : '編集を適用'}
                  </button>
              </div>
           </div>
            {isLoading && <div className="mt-6"><Loader message="編集を適用しています..." /></div>}
            {error && <div className="mt-4 p-4 bg-red-900/50 text-red-200 border border-red-700 rounded-md">{error}</div>}
           {editedImage && (
            <div className="mt-6">
              <h3 className="text-xl font-semibold mb-3">編集後の画像</h3>
              <img src={editedImage} alt="Edited" className="rounded-lg max-w-full mx-auto" style={{maxHeight: '60vh'}} />
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageStudio;