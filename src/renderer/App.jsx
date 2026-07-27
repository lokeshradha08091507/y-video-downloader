import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import UrlInputSection from './components/UrlInputSection';
import MetadataCard from './components/MetadataCard';
import FormatSelector from './components/FormatSelector';
import FolderPicker from './components/FolderPicker';
import DownloadQueue from './components/DownloadQueue';
import ToastNotification from './components/ToastNotification';
import SettingsModal from './components/SettingsModal';
import { Film, CheckCircle2 } from 'lucide-react';

export default function App() {
  const [analyzedMetadata, setAnalyzedMetadata] = useState(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [queue, setQueue] = useState([]);
  const [currentFolder, setCurrentFolder] = useState('');
  const [settings, setSettings] = useState({});
  const [samples, setSamples] = useState([]);
  const [toasts, setToasts] = useState([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const addToast = (message, type = 'info') => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 4500);
  };

  const removeToast = (id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  };

  // Load initial settings, queue, samples, and subscribe to events
  useEffect(() => {
    if (!window.api) return;

    window.api.getSettings().then(s => {
      setSettings(s);
      if (s.downloadDir) {
        setCurrentFolder(s.downloadDir);
      }
    }).catch(console.error);

    window.api.getQueue().then(q => {
      if (Array.isArray(q)) setQueue(q);
    }).catch(console.error);

    window.api.getSamples().then(sList => {
      if (Array.isArray(sList)) setSamples(sList);
    }).catch(console.error);

    // Event Subscriptions
    const unsubQueue = window.api.onQueueUpdated((updatedQueue) => {
      setQueue(updatedQueue);
    });

    const unsubProgress = window.api.onDownloadProgress((item) => {
      setQueue(prev => prev.map(q => q.id === item.id ? { ...q, ...item } : q));
    });

    return () => {
      if (unsubQueue) unsubQueue();
      if (unsubProgress) unsubProgress();
    };
  }, []);

  const handleAnalyze = async (url) => {
    setIsAnalyzing(true);
    setAnalyzedMetadata(null);
    try {
      const meta = await window.api.analyzeUrl(url);
      setAnalyzedMetadata(meta);
      addToast(`Analyzed video: "${meta.title.substring(0, 35)}..."`, 'success');
    } catch (err) {
      console.error('Analyze failed:', err);
      addToast(err.message || 'Failed to analyze video URL. Please check your link.', 'error');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleStartDownload = async (format) => {
    if (!analyzedMetadata) return;

    try {
      const result = await window.api.startDownload({
        url: analyzedMetadata.originalUrl,
        metadata: analyzedMetadata,
        format,
        destDir: currentFolder
      });
      addToast(`Added "${analyzedMetadata.title.substring(0, 30)}..." to queue`, 'success');
    } catch (err) {
      console.error('Download start failed:', err);
      addToast(err.message || 'Failed to start download.', 'error');
    }
  };

  const handleSelectFolder = async () => {
    try {
      const selected = await window.api.selectFolder();
      if (selected) {
        setCurrentFolder(selected);
        addToast(`Destination folder updated`, 'success');
        return selected;
      }
    } catch (err) {
      console.error('Folder selection failed:', err);
      addToast('Failed to select folder.', 'error');
    }
    return null;
  };

  const handleSaveSettings = async (newSettings) => {
    try {
      const updated = await window.api.saveSettings(newSettings);
      setSettings(updated);
      if (updated.downloadDir) {
        setCurrentFolder(updated.downloadDir);
      }
      addToast('Settings saved successfully', 'success');
    } catch (err) {
      addToast('Failed to save settings', 'error');
    }
  };

  const activeCount = queue.filter(q => q.status === 'downloading').length;

  return (
    <div className="app-layout">
      <Header 
        onOpenSettings={() => setIsSettingsOpen(true)} 
        activeCount={activeCount}
      />

      <main className="main-content">
        {/* Left Column: Input, Metadata & Format Picker */}
        <div className="panel">
          <h2 className="panel-title">
            <Film size={20} style={{ color: 'var(--accent-primary)' }} />
            Video Extractor & Format Picker
          </h2>

          <UrlInputSection 
            onAnalyze={handleAnalyze} 
            isLoading={isAnalyzing} 
            samples={samples}
          />

          {analyzedMetadata && (
            <>
              <MetadataCard metadata={analyzedMetadata} />
              
              <FormatSelector 
                formats={analyzedMetadata.formats} 
                onDownloadStart={handleStartDownload}
                isDownloading={isAnalyzing}
              />
            </>
          )}

          <FolderPicker 
            currentFolder={currentFolder} 
            onChangeFolder={handleSelectFolder}
            onOpenFolder={(f) => window.api.openFolder(f)}
          />
        </div>

        {/* Right Column: Download Queue & Controls */}
        <DownloadQueue 
          queue={queue}
          onPause={(id) => window.api.pauseDownload(id)}
          onResume={(id) => window.api.resumeDownload(id)}
          onCancel={(id) => window.api.cancelDownload(id)}
          onOpenFolder={(f) => window.api.openFolder(f)}
          onOpenFile={(f) => window.api.openFile(f)}
          onClearCompleted={() => window.api.clearCompletedQueue()}
        />
      </main>

      <ToastNotification toasts={toasts} onCloseToast={removeToast} />

      <SettingsModal 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)}
        settings={settings}
        onSaveSettings={handleSaveSettings}
        onChangeFolder={handleSelectFolder}
      />
    </div>
  );
}
