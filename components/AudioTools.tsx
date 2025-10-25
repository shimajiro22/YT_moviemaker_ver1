import React, { useState, useCallback, useRef } from 'react';
import { generateSpeech, connectToLiveTranscription } from '../services/geminiService';
import Loader from './Loader';
import type { LiveSession } from '@google/genai';

type AudioMode = 'tts' | 'stt';

const AudioTools: React.FC = () => {
  const [mode, setMode] = useState<AudioMode>('tts');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // TTS State
  const [ttsText, setTtsText] = useState<string>('こんにちは！Geminiクリエイティブスイートへようこそ。提供されたテキストを読み上げることができます。');
  const audioContextRef = useRef<AudioContext | null>(null);

  // STT State
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [transcript, setTranscript] = useState<string>('');
  const sessionRef = useRef<LiveSession | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const processorRef = useRef<ScriptProcessorNode | null>(null);

  const handleGenerateSpeech = useCallback(async () => {
    if (!ttsText) {
      setError('読み上げるテキストを入力してください。');
      return;
    }
    setIsLoading(true);
    setError(null);
    try {
      const audioBuffer = await generateSpeech(ttsText);
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      const source = audioContextRef.current.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(audioContextRef.current.destination);
      source.start();
    } catch (err) {
      setError(err instanceof Error ? err.message : '不明なエラーが発生しました。');
    } finally {
      setIsLoading(false);
    }
  }, [ttsText]);

  const startTranscription = useCallback(async () => {
    setIsRecording(true);
    setError(null);
    setTranscript('');
    try {
      const { session, stream, processor } = await connectToLiveTranscription((text) => {
        setTranscript(prev => prev + text);
      }, (isFinal, fullText) => {
          if(isFinal) {
             console.log("最終的な文字起こし:", fullText);
             // Can add logic here to handle final transcripts
          }
      });
      sessionRef.current = session;
      streamRef.current = stream;
      processorRef.current = processor;
    } catch (err) {
      setError(err instanceof Error ? err.message : '文字起こしを開始できませんでした。マイクの権限を確認してください。');
      setIsRecording(false);
    }
  }, []);

  const stopTranscription = useCallback(() => {
    setIsRecording(false);
    sessionRef.current?.close();
    streamRef.current?.getTracks().forEach(track => track.stop());
    processorRef.current?.disconnect();
    
    sessionRef.current = null;
    streamRef.current = null;
    processorRef.current = null;
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-center p-1 bg-gray-800/50 rounded-lg border border-gray-700/50 w-fit mx-auto">
        <button onClick={() => setMode('tts')} className={`px-4 py-2 text-sm font-medium rounded-md transition ${mode === 'tts' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700/50'}`}>テキスト読み上げ</button>
        <button onClick={() => setMode('stt')} className={`px-4 py-2 text-sm font-medium rounded-md transition ${mode === 'stt' ? 'bg-blue-600 text-white' : 'text-gray-400 hover:bg-gray-700/50'}`}>音声文字起こし</button>
      </div>

      {isLoading && <Loader message={mode === 'tts' ? '音声を生成中...' : '接続中...'} />}
      {error && <div className="p-4 bg-red-900/50 text-red-200 border border-red-700 rounded-md">{error}</div>}

      {mode === 'tts' && (
        <div className="p-6 bg-gray-800/50 rounded-xl border border-gray-700/50">
          <h2 className="text-2xl font-bold mb-4">テキスト読み上げ</h2>
          <textarea
            value={ttsText}
            onChange={(e) => setTtsText(e.target.value)}
            className="w-full h-40 bg-gray-700 border border-gray-600 rounded-md p-2 focus:ring-2 focus:ring-blue-500"
          />
          <button onClick={handleGenerateSpeech} disabled={isLoading} className="mt-4 w-full bg-blue-600 hover:bg-blue-700 disabled:bg-blue-800/50 text-white font-bold py-3 rounded-md transition">
            {isLoading ? '生成中...' : '音声を生成して再生'}
          </button>
        </div>
      )}

      {mode === 'stt' && (
        <div className="p-6 bg-gray-800/50 rounded-xl border border-gray-700/50">
          <h2 className="text-2xl font-bold mb-4">ライブ音声文字起こし</h2>
          <div className="flex justify-center mb-4">
            <button
              onClick={isRecording ? stopTranscription : startTranscription}
              className={`px-6 py-3 font-bold rounded-full transition text-white flex items-center gap-2 ${isRecording ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700'}`}
            >
              <span className={`w-3 h-3 rounded-full ${isRecording ? 'bg-white animate-pulse' : 'bg-white'}`}></span>
              {isRecording ? '録音停止' : '録音開始'}
            </button>
          </div>
          <div className="w-full min-h-[10rem] bg-gray-900/70 border border-gray-600 rounded-md p-3">
            <p className="text-gray-300 whitespace-pre-wrap">{transcript || (isRecording ? "聞き取り中..." : "「録音開始」を押して話し始めてください。")}</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default AudioTools;