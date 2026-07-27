const BaseProvider = require('./BaseProvider');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');
const { URL } = require('url');

class DirectHttpProvider extends BaseProvider {
  constructor() {
    super('DirectHttpProvider');
  }

  canHandle(url) {
    if (!url || typeof url !== 'string') return false;
    try {
      const parsed = new URL(url);
      const pathname = parsed.pathname.toLowerCase();
      const directExtensions = ['.mp4', '.webm', '.mkv', '.avi', '.mov', '.mp3', '.m4a', '.aac', '.flac', '.wav', '.ogg'];
      return directExtensions.some(ext => pathname.endsWith(ext)) || url.includes('gtv-videos-bucket');
    } catch (e) {
      return false;
    }
  }

  async analyze(url) {
    const parsed = new URL(url);
    const filename = path.basename(parsed.pathname) || 'video_stream.mp4';
    const ext = path.extname(filename).substring(1).toLowerCase() || 'mp4';
    const isAudio = ['mp3', 'm4a', 'aac', 'flac', 'wav', 'ogg'].includes(ext);

    let contentLength = 0;
    try {
      const headers = await this.fetchHeaders(url);
      if (headers['content-length']) {
        contentLength = parseInt(headers['content-length'], 10);
      }
    } catch (e) {
      console.warn('Could not fetch content-length via HEAD:', e.message);
    }

    const estimatedSizeMb = contentLength > 0 ? parseFloat((contentLength / (1024 * 1024)).toFixed(1)) : 45.0;

    return {
      provider: this.name,
      id: `direct-${Buffer.from(url).toString('base64').substring(0, 12)}`,
      originalUrl: url,
      title: filename.replace(path.extname(filename), '') || 'Direct Video Stream',
      thumbnail: isAudio 
        ? 'https://images.unsplash.com/photo-1511671782779-c97d3d27a1d4?w=600&q=80'
        : 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=600&q=80',
      duration: 0, // unknown for direct raw stream
      author: parsed.hostname,
      formats: isAudio ? [
        { formatId: 'direct-audio', resolution: 'Audio Only', container: ext || 'mp3', type: 'audio', note: 'Direct Audio Stream', estimatedSizeMb }
      ] : [
        { formatId: 'direct-original', resolution: 'Original Quality', container: ext || 'mp4', type: 'video', note: 'Direct Source Stream', estimatedSizeMb },
        { formatId: 'direct-720p', resolution: '720p HD', container: 'mp4', type: 'video', note: 'Transcoded Stream', estimatedSizeMb: Math.round(estimatedSizeMb * 0.6) },
        { formatId: 'direct-mp3', resolution: 'Audio Only', container: 'mp3', type: 'audio', note: 'Extracted MP3 Audio', estimatedSizeMb: Math.round(estimatedSizeMb * 0.15) }
      ]
    };
  }

  fetchHeaders(url) {
    return new Promise((resolve, reject) => {
      const client = url.startsWith('https') ? https : http;
      const req = client.request(url, { method: 'HEAD', timeout: 5000 }, (res) => {
        resolve(res.headers);
      });
      req.on('error', reject);
      req.on('timeout', () => { req.destroy(); reject(new Error('HEAD request timed out')); });
      req.end();
    });
  }

  async download(options, progressCallback, stateManager) {
    const { url, destDir, filename, format } = options;
    const client = url.startsWith('https') ? https : http;
    const ext = format?.container || 'mp4';
    const safeTitle = (filename || 'video_download').replace(/[/\\?%*:|"<>]/g, '_');
    const outputPath = path.join(destDir, `${safeTitle}.${ext}`);

    return new Promise((resolve, reject) => {
      let fileStream;
      let startByte = 0;

      if (fs.existsSync(outputPath)) {
        startByte = fs.statSync(outputPath).size;
      }

      const reqHeaders = {};
      if (startByte > 0) {
        reqHeaders['Range'] = `bytes=${startByte}-`;
      }

      const request = client.get(url, { headers: reqHeaders }, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          // Follow redirects
          options.url = response.headers.location;
          return this.download(options, progressCallback, stateManager).then(resolve).catch(reject);
        }

        if (response.statusCode !== 200 && response.statusCode !== 206) {
          return reject(new Error(`Server responded with HTTP ${response.statusCode}`));
        }

        const contentLength = parseInt(response.headers['content-length'] || '0', 10);
        const totalBytes = response.statusCode === 206 ? startByte + contentLength : contentLength;
        let downloadedBytes = startByte;

        fileStream = fs.createWriteStream(outputPath, { flags: startByte > 0 ? 'a' : 'w' });

        let lastTime = Date.now();
        let lastDownloaded = downloadedBytes;
        let currentSpeed = 0;

        response.on('data', (chunk) => {
          if (stateManager.isCancelled()) {
            request.destroy();
            fileStream.close();
            try { fs.unlinkSync(outputPath); } catch (e) {}
            return reject(new Error('Download cancelled by user'));
          }

          if (stateManager.isPaused()) {
            request.destroy();
            fileStream.close();
            return resolve({ paused: true, outputPath, downloadedBytes });
          }

          downloadedBytes += chunk.length;
          fileStream.write(chunk);

          const now = Date.now();
          const timeDiff = (now - lastTime) / 1000;
          if (timeDiff >= 0.4) {
            currentSpeed = (downloadedBytes - lastDownloaded) / timeDiff;
            lastTime = now;
            lastDownloaded = downloadedBytes;
          }

          const percentage = totalBytes > 0 ? Math.min(100, Math.round((downloadedBytes / totalBytes) * 100)) : 0;
          const remainingBytes = totalBytes - downloadedBytes;
          const etaSeconds = currentSpeed > 0 ? Math.ceil(remainingBytes / currentSpeed) : 0;

          progressCallback({
            percentage,
            speedBytesPerSec: currentSpeed,
            etaSeconds,
            downloadedBytes,
            totalBytes
          });
        });

        response.on('end', () => {
          fileStream.end(() => {
            progressCallback({
              percentage: 100,
              speedBytesPerSec: 0,
              etaSeconds: 0,
              downloadedBytes: totalBytes || downloadedBytes,
              totalBytes: totalBytes || downloadedBytes
            });
            resolve(outputPath);
          });
        });

        response.on('error', (err) => {
          if (fileStream) fileStream.close();
          reject(err);
        });
      });

      request.on('error', (err) => {
        if (fileStream) fileStream.close();
        reject(err);
      });

      stateManager.onCancel(() => {
        request.destroy();
        if (fileStream) fileStream.close();
        try { fs.unlinkSync(outputPath); } catch (e) {}
        reject(new Error('Download cancelled by user'));
      });
    });
  }
}

module.exports = DirectHttpProvider;
