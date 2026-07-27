const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  analyzeUrl: (url) => ipcRenderer.invoke('analyze-url', url),
  startDownload: (options) => ipcRenderer.invoke('start-download', options),
  pauseDownload: (id) => ipcRenderer.invoke('pause-download', id),
  resumeDownload: (id) => ipcRenderer.invoke('resume-download', id),
  cancelDownload: (id) => ipcRenderer.invoke('cancel-download', id),
  getQueue: () => ipcRenderer.invoke('get-queue'),
  clearCompletedQueue: () => ipcRenderer.invoke('clear-completed-queue'),
  selectFolder: () => ipcRenderer.invoke('select-folder'),
  openFolder: (folderPath) => ipcRenderer.invoke('open-folder', folderPath),
  openFile: (filePath) => ipcRenderer.invoke('open-file', filePath),
  getClipboardText: () => ipcRenderer.invoke('get-clipboard-text'),
  getSettings: () => ipcRenderer.invoke('get-settings'),
  saveSettings: (settings) => ipcRenderer.invoke('save-settings', settings),
  getSamples: () => ipcRenderer.invoke('get-samples'),
  
  onQueueUpdated: (callback) => {
    const listener = (event, queue) => callback(queue);
    ipcRenderer.on('queue-updated', listener);
    return () => ipcRenderer.removeListener('queue-updated', listener);
  },
  onDownloadProgress: (callback) => {
    const listener = (event, item) => callback(item);
    ipcRenderer.on('download-progress', listener);
    return () => ipcRenderer.removeListener('download-progress', listener);
  }
});
