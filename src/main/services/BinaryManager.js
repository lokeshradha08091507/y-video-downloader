const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync, spawn } = require('child_process');
const { app } = require('electron');

class BinaryManager {
  constructor() {
    try {
      this.binDir = path.join(app.getPath('userData'), 'bin');
    } catch (e) {
      this.binDir = path.join(process.cwd(), '.bin');
    }

    if (!fs.existsSync(this.binDir)) {
      fs.mkdirSync(this.binDir, { recursive: true });
    }

    this.ytDlpPath = path.join(this.binDir, process.platform === 'win32' ? 'yt-dlp.exe' : 'yt-dlp');
    this.downloadPromise = null;
  }

  isYtDlpAvailable() {
    // Check local bin file
    if (fs.existsSync(this.ytDlpPath)) {
      if (process.platform !== 'win32') {
        try { fs.chmodSync(this.ytDlpPath, 0o755); } catch (e) {}
      }
      return true;
    }

    // Check system PATH
    try {
      execSync('yt-dlp --version', { stdio: 'ignore' });
      this.ytDlpPath = 'yt-dlp';
      return true;
    } catch (e) {}

    // Check python3 module yt-dlp
    try {
      execSync('python3 -m yt_dlp --version', { stdio: 'ignore' });
      this.usePythonCmd = 'python3';
      return true;
    } catch (e) {}

    // Check python module yt-dlp
    try {
      execSync('python -m yt_dlp --version', { stdio: 'ignore' });
      this.usePythonCmd = 'python';
      return true;
    } catch (err) {
      return false;
    }
  }

  isFfmpegAvailable() {
    const ffmpegPath = path.join(this.binDir, process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');
    if (fs.existsSync(ffmpegPath)) {
      if (process.platform !== 'win32') {
        try { fs.chmodSync(ffmpegPath, 0o755); } catch (e) {}
      }
      return ffmpegPath;
    }
    try {
      execSync('ffmpeg -version', { stdio: 'ignore' });
      return 'ffmpeg';
    } catch (e) {
      return false;
    }
  }

  getYtDlpCommand() {
    if (fs.existsSync(this.ytDlpPath) || this.ytDlpPath === 'yt-dlp') {
      return { cmd: this.ytDlpPath, argsPrefix: [] };
    }
    if (this.usePythonCmd) {
      return { cmd: this.usePythonCmd, argsPrefix: ['-m', 'yt_dlp'] };
    }
    return { cmd: 'yt-dlp', argsPrefix: [] };
  }

  async ensureYtDlp(progressCallback = () => {}) {
    if (this.isYtDlpAvailable()) {
      return this.ytDlpPath;
    }

    if (this.downloadPromise) {
      return this.downloadPromise;
    }

    progressCallback({ status: 'downloading', message: 'Downloading yt-dlp engine for full site & YouTube extraction...' });

    // Download prebuilt binary from official GitHub release
    const downloadUrl = process.platform === 'win32'
      ? 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp.exe'
      : 'https://github.com/yt-dlp/yt-dlp/releases/latest/download/yt-dlp';

    this.downloadPromise = new Promise((resolve, reject) => {
      const file = fs.createWriteStream(this.ytDlpPath);
      
      const request = (url) => {
        https.get(url, (response) => {
          if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
            return request(response.headers.location);
          }

          if (response.statusCode !== 200) {
            this.downloadPromise = null;
            return reject(new Error(`Failed to download yt-dlp: HTTP ${response.statusCode}`));
          }

          const totalBytes = parseInt(response.headers['content-length'] || '0', 10);
          let downloadedBytes = 0;

          response.on('data', (chunk) => {
            downloadedBytes += chunk.length;
            if (totalBytes > 0) {
              const pct = Math.round((downloadedBytes / totalBytes) * 100);
              progressCallback({ status: 'downloading', progress: pct, downloadedBytes, totalBytes });
            }
          });

          response.pipe(file);

          file.on('finish', () => {
            file.close(() => {
              if (process.platform !== 'win32') {
                try {
                  fs.chmodSync(this.ytDlpPath, 0o755);
                } catch (e) {}
              }
              progressCallback({ status: 'complete', message: 'yt-dlp binary downloaded successfully.' });
              resolve(this.ytDlpPath);
            });
          });
        }).on('error', (err) => {
          this.downloadPromise = null;
          fs.unlink(this.ytDlpPath, () => {});
          reject(err);
        });
      };

      request(downloadUrl);
    });

    return this.downloadPromise;
  }
}

module.exports = new BinaryManager();
