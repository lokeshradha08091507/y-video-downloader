import React from 'react';
import { 
  Pause, 
  Play, 
  XCircle, 
  FolderOpen, 
  FileVideo, 
  CheckCircle2, 
  AlertCircle, 
  Trash2, 
  ListOrdered 
} from 'lucide-react';

export default function DownloadQueue({ 
  queue = [], 
  onPause, 
  onResume, 
  onCancel, 
  onOpenFolder, 
  onOpenFile, 
  onClearCompleted 
}) {
  const formatBytes = (bytes) => {
    if (!bytes || bytes <= 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatSpeed = (bytesPerSec) => {
    if (!bytesPerSec || bytesPerSec <= 0) return '0 KB/s';
    return `${formatBytes(bytesPerSec)}/s`;
  };

  const formatEta = (seconds) => {
    if (!seconds || seconds <= 0) return '--:--';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const completedCount = queue.filter(q => q.status === 'completed').length;

  return (
    <div className="panel" style={{ flex: 1 }}>
      <div className="queue-header">
        <h2 className="panel-title" style={{ borderBottom: 'none', paddingBottom: 0 }}>
          <ListOrdered size={20} style={{ color: 'var(--accent-primary)' }} />
          Download Queue ({queue.length})
        </h2>

        {completedCount > 0 && (
          <button 
            className="btn-secondary" 
            style={{ padding: '0.35rem 0.65rem', fontSize: '0.78rem' }}
            onClick={onClearCompleted}
            title="Clear completed downloads from queue"
          >
            <Trash2 size={13} />
            <span>Clear Done</span>
          </button>
        )}
      </div>

      {queue.length === 0 ? (
        <div className="empty-state">
          <FileVideo size={42} style={{ opacity: 0.3 }} />
          <p style={{ fontWeight: 500 }}>No active downloads in queue</p>
          <span style={{ fontSize: '0.8rem' }}>Paste a video URL above and click Analyze to start downloading.</span>
        </div>
      ) : (
        <div className="queue-list">
          {queue.map((item) => {
            const isDownloading = item.status === 'downloading';
            const isCompleted = item.status === 'completed';
            const isPaused = item.status === 'paused';
            const isError = item.status === 'error';
            const isCancelled = item.status === 'cancelled';

            return (
              <div key={item.id} className="queue-card">
                <div className="queue-card-top">
                  <img 
                    src={item.thumbnail || 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=600&q=80'} 
                    alt={item.title} 
                    className="queue-thumb"
                    onError={(e) => { e.target.src = 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?w=600&q=80'; }}
                  />

                  <div className="queue-details">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '0.5rem' }}>
                      <span className="queue-title" title={item.title}>{item.title}</span>
                      <span className={`status-badge ${item.status}`}>{item.status}</span>
                    </div>

                    <div className="queue-meta">
                      <span>{item.format?.resolution || 'Video'} ({item.format?.container?.toUpperCase() || 'MP4'})</span>
                      <span>•</span>
                      <span>{formatBytes(item.downloadedBytes)} / {formatBytes(item.totalBytes)}</span>
                    </div>
                  </div>
                </div>

                {/* Real-time progress bar */}
                <div className="progress-bar-container">
                  <div 
                    className={`progress-bar-fill ${isCompleted ? 'completed' : ''}`}
                    style={{ width: `${Math.min(100, Math.max(0, item.progress || 0))}%` }}
                  />
                </div>

                {/* Progress metrics and Controls */}
                <div className="progress-stats">
                  <div>
                    {isDownloading && (
                      <span style={{ fontWeight: 600, color: 'var(--accent-primary)' }}>
                        {item.progress}% • {formatSpeed(item.speedBytesPerSec)} • ETA: {formatEta(item.etaSeconds)}
                      </span>
                    )}
                    {isCompleted && (
                      <span style={{ color: 'var(--success-color)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <CheckCircle2 size={13} /> Completed & Saved
                      </span>
                    )}
                    {isPaused && (
                      <span style={{ color: 'var(--warning-color)', fontWeight: 600 }}>
                        Paused ({item.progress}%)
                      </span>
                    )}
                    {isError && (
                      <span style={{ color: 'var(--error-color)', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                        <AlertCircle size={13} /> {item.errorMessage || 'Error occurred'}
                      </span>
                    )}
                    {isCancelled && (
                      <span style={{ color: 'var(--text-muted)' }}>Cancelled</span>
                    )}
                  </div>

                  <div className="queue-actions">
                    {isDownloading && (
                      <>
                        <button 
                          className="btn-icon" 
                          style={{ width: 28, height: 28 }} 
                          onClick={() => onPause(item.id)}
                          title="Pause Download"
                        >
                          <Pause size={14} />
                        </button>
                        <button 
                          className="btn-icon" 
                          style={{ width: 28, height: 28, color: 'var(--error-color)' }} 
                          onClick={() => onCancel(item.id)}
                          title="Cancel Download"
                        >
                          <XCircle size={14} />
                        </button>
                      </>
                    )}

                    {(isPaused || isError) && (
                      <>
                        <button 
                          className="btn-icon" 
                          style={{ width: 28, height: 28, color: 'var(--success-color)' }} 
                          onClick={() => onResume(item.id)}
                          title="Resume Download"
                        >
                          <Play size={14} />
                        </button>
                        <button 
                          className="btn-icon" 
                          style={{ width: 28, height: 28, color: 'var(--error-color)' }} 
                          onClick={() => onCancel(item.id)}
                          title="Cancel Download"
                        >
                          <XCircle size={14} />
                        </button>
                      </>
                    )}

                    {isCompleted && (
                      <>
                        <button 
                          className="btn-secondary" 
                          style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }} 
                          onClick={() => onOpenFolder(item.destDir)}
                          title="Open Folder in File Explorer"
                        >
                          <FolderOpen size={13} />
                          <span>Folder</span>
                        </button>

                        {item.savedPath && (
                          <button 
                            className="btn-secondary" 
                            style={{ padding: '0.25rem 0.55rem', fontSize: '0.75rem' }} 
                            onClick={() => onOpenFile(item.savedPath)}
                            title="Show file in directory"
                          >
                            <FileVideo size={13} />
                            <span>File</span>
                          </button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
