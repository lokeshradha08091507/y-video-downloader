const { app, BrowserWindow, ipcMain, dialog, clipboard, shell } = require('electron');
const path = require('path');
const providerManager = require('./services/ProviderManager');
const downloadManager = require('./services/DownloadManager');
const storeService = require('./services/StoreService');
const binaryManager = require('./services/BinaryManager');
const SampleProvider = require('./services/providers/SampleProvider');

let mainWindow = null;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1180,
    height: 820,
    minWidth: 900,
    minHeight: 650,
    title: 'Video Downloader',
    frame: true,
    show: false,
    backgroundColor: '#0F172A',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      webSecurity: false // Allow loading local file protocols and cross-origin thumbnails smoothly
    }
  });

  downloadManager.setMainWindow(mainWindow);

  // In development, load Vite dev server URL if available; otherwise load build index.html
  const devServerUrl = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
  if (process.env.NODE_ENV === 'development' || process.argv.includes('--dev')) {
    mainWindow.loadURL(devServerUrl).catch(() => {
      mainWindow.loadFile(path.join(__dirname, '../../dist/index.html'));
    });
  } else {
    mainWindow.loadFile(path.join(__dirname, '../../dist/index.html')).catch(() => {
      mainWindow.loadURL(devServerUrl);
    });
  }

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

// Ensure single app instance
const gotTheLock = app.requestSingleInstanceLock();
if (!gotTheLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    createWindow();

    // Trigger background check for yt-dlp binary if needed
    binaryManager.ensureYtDlp().catch(err => {
      console.warn('Binary setup status notice:', err.message);
    });

    app.on('activate', () => {
      if (BrowserWindow.getAllWindows().length === 0) createWindow();
    });
  });
}

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});

// IPC Handler Registrations
ipcMain.handle('analyze-url', async (event, url) => {
  try {
    return await providerManager.analyze(url);
  } catch (err) {
    console.error('IPC analyze-url error:', err);
    throw new Error(err.message || 'Failed to analyze URL');
  }
});

ipcMain.handle('start-download', async (event, options) => {
  try {
    return downloadManager.addToQueue(options);
  } catch (err) {
    console.error('IPC start-download error:', err);
    throw new Error(err.message || 'Failed to start download');
  }
});

ipcMain.handle('pause-download', async (event, id) => {
  downloadManager.pauseDownload(id);
  return { success: true };
});

ipcMain.handle('resume-download', async (event, id) => {
  downloadManager.resumeDownload(id);
  return { success: true };
});

ipcMain.handle('cancel-download', async (event, id) => {
  downloadManager.cancelDownload(id);
  return { success: true };
});

ipcMain.handle('get-queue', async () => {
  return downloadManager.getQueue();
});

ipcMain.handle('clear-completed-queue', async () => {
  downloadManager.clearCompleted();
  return { success: true };
});

ipcMain.handle('select-folder', async () => {
  const currentDefault = storeService.get('downloadDir') || storeService.getDefaultDownloadDir();
  const result = await dialog.showOpenDialog(mainWindow, {
    title: 'Select Video Download Folder',
    defaultPath: currentDefault,
    properties: ['openDirectory', 'createDirectory']
  });

  if (!result.canceled && result.filePaths.length > 0) {
    const selectedFolder = result.filePaths[0];
    if (storeService.get('rememberFolder')) {
      storeService.set('downloadDir', selectedFolder);
    }
    return selectedFolder;
  }
  return null;
});

ipcMain.handle('open-folder', async (event, folderPath) => {
  if (folderPath) {
    await shell.openPath(folderPath);
  }
  return { success: true };
});

ipcMain.handle('open-file', async (event, filePath) => {
  if (filePath) {
    await shell.showItemInFolder(filePath);
  }
  return { success: true };
});

ipcMain.handle('get-clipboard-text', async () => {
  return clipboard.readText();
});

ipcMain.handle('get-settings', async () => {
  return storeService.getAll();
});

ipcMain.handle('save-settings', async (event, newSettings) => {
  return storeService.updateAll(newSettings);
});

ipcMain.handle('get-samples', async () => {
  const sampleProvider = new SampleProvider();
  return sampleProvider.getSamples();
});
