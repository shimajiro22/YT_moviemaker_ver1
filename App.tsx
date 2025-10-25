import React, { useState } from 'react';
import YouTubeAnalyzer from './components/YouTubeAnalyzer';
import ImageStudio from './components/ImageStudio';
import VideoFactory from './components/VideoFactory';
import AudioTools from './components/AudioTools';
import VideoAnalyzer from './components/VideoAnalyzer';
import { YouTubeIcon } from './components/icons/YouTubeIcon';
import { ImageIcon } from './components/icons/ImageIcon';
import { VideoIcon } from './components/icons/VideoIcon';
import { AudioIcon } from './components/icons/AudioIcon';
import { AnalyzeIcon } from './components/icons/AnalyzeIcon';
import { View } from './types';

const App: React.FC = () => {
  const [activeView, setActiveView] = useState<View>(View.YouTubeAnalyzer);

  const navItems = [
    { id: View.YouTubeAnalyzer, label: 'YTトレンド分析', icon: <YouTubeIcon /> },
    { id: View.ImageStudio, label: '画像スタジオ', icon: <ImageIcon /> },
    { id: View.VideoFactory, label: '動画ファクトリー', icon: <VideoIcon /> },
    { id: View.AudioTools, label: '音声ツール', icon: <AudioIcon /> },
    { id: View.VideoAnalyzer, label: '動画アナライザー', icon: <AnalyzeIcon /> },
  ];

  const renderView = () => {
    switch (activeView) {
      case View.YouTubeAnalyzer:
        return <YouTubeAnalyzer />;
      case View.ImageStudio:
        return <ImageStudio />;
      case View.VideoFactory:
        return <VideoFactory />;
      case View.AudioTools:
        return <AudioTools />;
      case View.VideoAnalyzer:
        return <VideoAnalyzer />;
      default:
        return <YouTubeAnalyzer />;
    }
  };

  return (
    <div className="flex flex-col md:flex-row h-screen font-sans bg-gray-900 text-gray-200">
      <nav className="w-full md:w-64 bg-gray-900/30 backdrop-blur-lg border-b md:border-r border-gray-700/50 p-4 shrink-0">
        <div className="flex flex-row md:flex-col items-center justify-between">
          <h1 className="text-xl font-bold text-white mb-0 md:mb-8">Geminiクリエイティブスイート</h1>
          <ul className="flex flex-row md:flex-col space-x-2 md:space-x-0 md:space-y-2">
            {navItems.map(item => (
              <li key={item.id}>
                <button
                  onClick={() => setActiveView(item.id)}
                  className={`w-full flex items-center p-3 rounded-lg transition-colors duration-200 ${
                    activeView === item.id 
                    ? 'bg-blue-600/50 text-white' 
                    : 'hover:bg-gray-700/50 text-gray-400 hover:text-white'
                  }`}
                >
                  {item.icon}
                  <span className="hidden md:inline ml-3">{item.label}</span>
                </button>
              </li>
            ))}
          </ul>
        </div>
      </nav>
      <main className="flex-1 p-4 sm:p-6 lg:p-8 overflow-y-auto">
        {renderView()}
      </main>
    </div>
  );
};

export default App;