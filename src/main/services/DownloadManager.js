const providerManager = require('./ProviderManager');
const storeService = require('./StoreService');
const fs = require('fs');
const path = require('path');

class TaskStateManager {
  constructor() {
    this.status = 'active'; // 'active', 'paused', 'cancelled'
    this.cancelCallbacks = [];
  }

  isPaused() {
    return this.status === 'paused';
  }

  isCancelled() {
    return this.status === 'cancelled';
  }

  pause() {
    this.status = 'paused';
  }

  resume() {
    this.status = 'active';
  }

  cancel() {
    this.status = 'cancelled';
    this.cancelCallbacks.forEach(cb => {
      try { cb(); } catch (e) {}
    });
  }

  onCancel(cb) {
    this.cancelCallbacks.push(cb);
  }
}

class DownloadManager {
  constructor() {
    this.queue = [];
    this.activeTasks = new Map(); // downloadId -> { task, stateManager, promise }
    this.mainWindow = null;
  }

  setMainWindow(window) {
    this.mainWindow = window;
  }

  broadcastQueueUpdate() {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('queue-updated', this.getQueue());
    }
  }

  broadcastItemProgress(item) {
    if (this.mainWindow && !this.mainWindow.isDestroyed()) {
      this.mainWindow.webContents.send('download-progress', item);
    }
  }

  getQueue() {
    return this.queue.map(item => ({
      id: item.id,
      title: item.title,
      thumbnail: item.thumbnail,
      url: item.url,
      destDir: item.destDir,
      filename: item.filename,
      savedPath: item.savedPath,
      format: item.format,
      status: item.status, // 'queued', 'downloading', 'paused', 'completed', 'error', 'cancelled'
      progress: item.progress || 0,
      speedBytesPerSec: item.speedBytesPerSec || 0,
      etaSeconds: item.etaSeconds || 0,
      downloadedBytes: item.downloadedBytes || 0,
      totalBytes: item.totalBytes || 0,
      errorMessage: item.errorMessage || null,
      createdAt: item.createdAt
    }));
  }

  addToQueue(options) {
    const { url, metadata, format, destDir } = options;
    const downloadFolder = destDir || storeService.get('downloadDir') || storeService.getDefaultDownloadDir();
    
    // Check if directory exists
    if (!fs.existsSync(downloadFolder)) {
      try {
        fs.mkdirSync(downloadFolder, { recursive: true });
      } catch (e) {
        throw new Error(`Invalid destination folder: ${downloadFolder}`);
      }
    }

    const downloadId = `dl_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const filename = `${metadata.title.replace(/[/\\?%*:|"<>]/g, '_')}`;

    const queueItem = {
      id: downloadId,
      url: url || metadata.originalUrl,
      title: metadata.title || 'Video Download',
      thumbnail: metadata.thumbnail,
      format,
      destDir: downloadFolder,
      filename,
      status: 'queued',
      progress: 0,
      speedBytesPerSec: 0,
      etaSeconds: 0,
      downloadedBytes: 0,
      totalBytes: 0,
      createdAt: new Date().toISOString()
    };

    this.queue.push(queueItem);
    this.broadcastQueueUpdate();

    // Trigger process queue
    this.processQueue();

    return queueItem;
  }

  async processQueue() {
    const maxConcurrent = storeService.get('maxConcurrentDownloads') || 3;
    const activeCount = Array.from(this.activeTasks.values()).filter(t => t.item.status === 'downloading').length;

    if (activeCount >= maxConcurrent) {
      return;
    }

    const nextItem = this.queue.find(item => item.status === 'queued');
    if (!nextItem) return;

    this.startDownloadItem(nextItem);
  }

  async startDownloadItem(item) {
    item.status = 'downloading';
    this.broadcastQueueUpdate();

    const provider = providerManager.getProviderForUrl(item.url);
    const stateManager = new TaskStateManager();

    const taskObj = {
      item,
      stateManager,
      provider
    };

    this.activeTasks.set(item.id, taskObj);

    const progressCallback = (data) => {
      item.progress = data.percentage !== undefined ? data.percentage : item.progress;
      item.speedBytesPerSec = data.speedBytesPerSec || 0;
      item.etaSeconds = data.etaSeconds || 0;
      item.downloadedBytes = data.downloadedBytes || item.downloadedBytes;
      item.totalBytes = data.totalBytes || item.totalBytes;
      
      this.broadcastItemProgress(item);
    };

    try {
      const result = await provider.download(
        {
          downloadId: item.id,
          url: item.url,
          destDir: item.destDir,
          filename: item.filename,
          format: item.format
        },
        progressCallback,
        stateManager
      );

      if (result && result.paused) {
        item.status = 'paused';
        item.speedBytesPerSec = 0;
        this.broadcastQueueUpdate();
      } else {
        item.status = 'completed';
        item.progress = 100;
        item.speedBytesPerSec = 0;
        item.etaSeconds = 0;
        item.savedPath = typeof result === 'string' ? result : path.join(item.destDir, `${item.filename}.${item.format?.container || 'mp4'}`);
        
        // Save to store history
        const history = storeService.get('history') || [];
        history.unshift({
          id: item.id,
          title: item.title,
          url: item.url,
          savedPath: item.savedPath,
          completedAt: new Date().toISOString()
        });
        storeService.set('history', history.slice(0, 50));

        this.broadcastQueueUpdate();
      }
    } catch (err) {
      if (stateManager.isCancelled()) {
        item.status = 'cancelled';
      } else {
        item.status = 'error';
        item.errorMessage = err.message || 'Download failed';
      }
      item.speedBytesPerSec = 0;
      this.broadcastQueueUpdate();
    } finally {
      this.activeTasks.delete(item.id);
      this.processQueue();
    }
  }

  pauseDownload(downloadId) {
    const active = this.activeTasks.get(downloadId);
    if (active) {
      active.stateManager.pause();
    }
    const item = this.queue.find(q => q.id === downloadId);
    if (item) {
      item.status = 'paused';
      item.speedBytesPerSec = 0;
      this.broadcastQueueUpdate();
    }
  }

  resumeDownload(downloadId) {
    const item = this.queue.find(q => q.id === downloadId);
    if (item && (item.status === 'paused' || item.status === 'error')) {
      item.status = 'queued';
      item.errorMessage = null;
      this.broadcastQueueUpdate();
      this.processQueue();
    }
  }

  cancelDownload(downloadId) {
    const active = this.activeTasks.get(downloadId);
    if (active) {
      active.stateManager.cancel();
    }
    const itemIndex = this.queue.findIndex(q => q.id === downloadId);
    if (itemIndex !== -1) {
      this.queue[itemIndex].status = 'cancelled';
      this.broadcastQueueUpdate();
    }
  }

  clearCompleted() {
    this.queue = this.queue.filter(q => q.status === 'downloading' || q.status === 'queued' || q.status === 'paused');
    this.broadcastQueueUpdate();
  }
}

module.exports = new DownloadManager();
