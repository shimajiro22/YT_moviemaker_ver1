import { GoogleGenAI, Type, Modality } from '@google/genai';
import type { AspectRatio } from '../types';
import type { GenerateContentResponse, LiveSession, LiveServerMessage } from '@google/genai';

// --- UTILITY FUNCTIONS for Audio Handling ---
// Note: These must not be from external libraries per instructions.
const decode = (base64: string) => {
  const binaryString = atob(base64);
  const len = binaryString.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryString.charCodeAt(i);
  }
  return bytes;
};

const encode = (bytes: Uint8Array) => {
    let binary = '';
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    return btoa(binary);
};

const decodeAudioData = async (
  data: Uint8Array,
  ctx: AudioContext,
  sampleRate: number,
  numChannels: number,
): Promise<AudioBuffer> => {
  const dataInt16 = new Int16Array(data.buffer);
  const frameCount = dataInt16.length / numChannels;
  const buffer = ctx.createBuffer(numChannels, frameCount, sampleRate);

  for (let channel = 0; channel < numChannels; channel++) {
    const channelData = buffer.getChannelData(channel);
    for (let i = 0; i < frameCount; i++) {
      channelData[i] = dataInt16[i * numChannels + channel] / 32768.0;
    }
  }
  return buffer;
};


// --- API SERVICE FUNCTIONS ---

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * 1. Generates 10 popular video ideas based on a topic.
 * 2. Analyzes those ideas to find trends.
 * Uses gemini-2.5-pro with thinking mode.
 */
export const analyzeYoutubeTrends = async (topic: string, period: string): Promise<{ videoIdeas: string; trendAnalysis: string; }> => {
  const ai = getAI();
  const prompt = `
    「${period}」の期間における「${topic}」というトピックのGoogle検索トレンドに基づき、以下の2つのタスクを実行してください：

    TASK 1: YOUTUBE VIDEO IDEAS
    バイラルになりそうな、非常にエンゲージメントが高く視聴価値のあるYouTube動画のタイトルを10個リストアップしてください。番号付きリストでフォーマットしてください。

    TASK 2: TREND ANALYSIS
    YouTubeにおける「${topic}」の根底にあるトレンドを包括的に分析してください。現在成功しているコンテンツ、スタイル、台本構成、テーマを説明してください。なぜこれらのトピックは人気があるのでしょうか？成功の鍵となる要素は何ですか？詳細で網羅的な分析を提供してください。
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-pro',
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
      thinkingConfig: { thinkingBudget: 32768 }
    },
  });

  const text = response.text;
  const ideasMatch = text.match(/TASK 1: YOUTUBE VIDEO IDEAS([\s\S]*?)TASK 2: TREND ANALYSIS/);
  const analysisMatch = text.match(/TASK 2: TREND ANALYSIS([\s\S]*)/);

  return {
    videoIdeas: ideasMatch ? ideasMatch[1].trim() : '動画のアイデアを抽出できませんでした。',
    trendAnalysis: analysisMatch ? analysisMatch[1].trim() : 'トレンド分析を抽出できませんでした。',
  };
};


/**
 * Generates a script and a Veo prompt based on a trend analysis.
 */
export const generateScriptAndPrompt = async (trendAnalysis: string): Promise<{ script: string; veoPrompt: string; }> => {
    const ai = getAI();
    const prompt = `
    以下のYouTubeトレンド分析に基づいて：
    ---
    ${trendAnalysis}
    ---
    以下の2つのタスクを実行してください：

    TASK 1: SCRIPT GENERATION
    60秒の縦型YouTubeショート動画（アスペクト比9:16）用の、簡潔で魅力的な台本を作成してください。台本にはナレーションと視覚的な指示を含める必要があります。

    TASK 2: VEO PROMPT GENERATION
    台本に基づき、Veo動画生成モデルが動画を作成するための、単一で詳細かつ効果的なプロンプトを作成してください。プロンプトでは、ビジュアルスタイル、シーン、カメラの動き、全体の雰囲気を記述してください。
    `;
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
    });
    
    const text = response.text;
    const scriptMatch = text.match(/TASK 1: SCRIPT GENERATION([\s\S]*?)TASK 2: VEO PROMPT GENERATION/);
    const veoPromptMatch = text.match(/TASK 2: VEO PROMPT GENERATION([\s\S]*)/);
    
    return {
        script: scriptMatch ? scriptMatch[1].trim() : '台本を抽出できませんでした。',
        veoPrompt: veoPromptMatch ? veoPromptMatch[1].trim() : 'Veoプロンプトを抽出できませんでした。',
    };
};

/**
 * Generates an image using imagen-4.0-generate-001.
 */
export const generateImage = async (prompt: string): Promise<string> => {
  const ai = getAI();
  const response = await ai.models.generateImages({
    model: 'imagen-4.0-generate-001',
    prompt,
    config: {
      numberOfImages: 1,
      outputMimeType: 'image/jpeg',
      aspectRatio: '1:1',
    },
  });

  const base64ImageBytes = response.generatedImages[0].image.imageBytes;
  return `data:image/jpeg;base64,${base64ImageBytes}`;
};

/**
 * Edits an image using gemini-2.5-flash-image.
 */
export const editImage = async (prompt: string, imageBase64: string, mimeType: string): Promise<string> => {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: {
            parts: [
                { inlineData: { data: imageBase64, mimeType } },
                { text: prompt },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    for (const part of response.candidates[0].content.parts) {
        if (part.inlineData) {
            return `data:${part.inlineData.mimeType};base64,${part.inlineData.data}`;
        }
    }
    throw new Error("レスポンスで画像が生成されませんでした。");
};


const pollVideoOperation = async (operation: any): Promise<string> => {
    const ai = getAI();
    let currentOperation = operation;
    while (!currentOperation.done) {
        await new Promise(resolve => setTimeout(resolve, 10000));
        currentOperation = await ai.operations.getVideosOperation({ operation: currentOperation });
    }
    const downloadLink = currentOperation.response?.generatedVideos?.[0]?.video?.uri;
    if (!downloadLink) {
        throw new Error("動画の生成は完了しましたが、ダウンロードリンクが見つかりませんでした。");
    }
    const response = await fetch(`${downloadLink}&key=${process.env.API_KEY}`);
    const blob = await response.blob();
    return URL.createObjectURL(blob);
}

/**
 * Generates a video from text using Veo.
 */
export const generateVideoFromText = async (prompt: string, aspectRatio: AspectRatio): Promise<string> => {
    const ai = getAI();
    const operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt,
        config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: aspectRatio,
        }
    });
    return pollVideoOperation(operation);
};

/**
 * Generates a video from an image and text using Veo.
 */
export const generateVideoFromImage = async (prompt: string, imageBase64: string, mimeType: string, aspectRatio: AspectRatio): Promise<string> => {
    const ai = getAI();
    const operation = await ai.models.generateVideos({
        model: 'veo-3.1-fast-generate-preview',
        prompt: prompt,
        image: {
            imageBytes: imageBase64,
            mimeType: mimeType,
        },
        config: {
            numberOfVideos: 1,
            resolution: '720p',
            aspectRatio: aspectRatio
        }
    });
    return pollVideoOperation(operation);
};

/**
 * Generates speech from text using TTS model.
 */
export const generateSpeech = async (text: string): Promise<AudioBuffer> => {
    const ai = getAI();
    const response = await ai.models.generateContent({
        model: "gemini-2.5-flash-preview-tts",
        contents: [{ parts: [{ text: text }] }],
        config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
                voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
            },
        },
    });
    
    const base64Audio = response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data;
    if (!base64Audio) throw new Error("音声データが受信されませんでした。");

    const outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
    return decodeAudioData(decode(base64Audio), outputAudioContext, 24000, 1);
};


/**
 * Transcribes audio from microphone in real-time.
 */
export const connectToLiveTranscription = async (
    onChunk: (text: string) => void,
    onTurn: (isFinal: boolean, fullText: string) => void
): Promise<{ session: LiveSession, stream: MediaStream, processor: ScriptProcessorNode }> => {
    const ai = getAI();
    let currentInputTranscription = '';

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
    
    const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-09-2025',
        callbacks: {
            onopen: () => console.log('ライブセッションが開かれました。'),
            onmessage: (message: LiveServerMessage) => {
                if (message.serverContent?.inputTranscription) {
                    const text = message.serverContent.inputTranscription.text;
                    onChunk(text);
                    currentInputTranscription += text;
                }
                if (message.serverContent?.turnComplete) {
                    onTurn(true, currentInputTranscription);
                    currentInputTranscription = '';
                }
            },
            onerror: (e: ErrorEvent) => console.error('ライブセッションエラー:', e),
            onclose: (e: CloseEvent) => console.log('ライブセッションが閉じられました。'),
        },
        config: {
            inputAudioTranscription: {},
        },
    });

    const source = inputAudioContext.createMediaStreamSource(stream);
    const processor = inputAudioContext.createScriptProcessor(4096, 1, 1);
    
    processor.onaudioprocess = (audioProcessingEvent) => {
        const inputData = audioProcessingEvent.inputBuffer.getChannelData(0);
        const l = inputData.length;
        const int16 = new Int16Array(l);
        for (let i = 0; i < l; i++) {
            int16[i] = inputData[i] * 32768;
        }
        const pcmBlob = {
            data: encode(new Uint8Array(int16.buffer)),
            mimeType: 'audio/pcm;rate=16000',
        };

        sessionPromise.then((session) => {
            session.sendRealtimeInput({ media: pcmBlob });
        });
    };

    source.connect(processor);
    processor.connect(inputAudioContext.destination);
    
    const session = await sessionPromise;
    return { session, stream, processor };
};

/**
 * Analyzes video content based on a prompt.
 */
export const analyzeVideoContent = async (prompt: string, videoBase64: string, mimeType: string): Promise<string> => {
    const ai = getAI();
    const response: GenerateContentResponse = await ai.models.generateContent({
        model: 'gemini-2.5-pro',
        contents: {
            parts: [
                { text: prompt },
                { inlineData: { data: videoBase64, mimeType } },
            ],
        },
    });
    return response.text;
};