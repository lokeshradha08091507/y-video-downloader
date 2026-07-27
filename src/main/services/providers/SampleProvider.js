const BaseProvider = require('./BaseProvider');
const fs = require('fs');
const path = require('path');
const https = require('https');
const http = require('http');

class SampleProvider extends BaseProvider {
  constructor() {
    super('SampleProvider');

    this.samples = [
      {
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
        id: 'sample-big-buck-bunny',
        title: 'Big Buck Bunny (Blender Open Movie)',
        thumbnail: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=600&q=80',
        duration: 596,
        author: 'Blender Foundation (Creative Commons)',
        formats: [
          { formatId: '1080p-mp4', resolution: '1080p', container: 'mp4', type: 'video', note: '1080p HD Video + Audio', estimatedSizeMb: 158.0 },
          { formatId: '720p-mp4', resolution: '720p', container: 'mp4', type: 'video', note: '720p HD Video + Audio', estimatedSizeMb: 85.4 },
          { formatId: '480p-mp4', resolution: '480p', container: 'mp4', type: 'video', note: '480p SD Video + Audio', estimatedSizeMb: 42.1 },
          { formatId: 'mp3-audio', resolution: 'Audio Only', container: 'mp3', type: 'audio', note: 'High Quality MP3 Audio', estimatedSizeMb: 14.2 }
        ]
      },
      {
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ElephantsDream.mp4',
        id: 'sample-elephants-dream',
        title: 'Elephants Dream (Open Source Film)',
        thumbnail: 'https://images.unsplash.com/photo-1518709268805-4e9042af9f23?w=600&q=80',
        duration: 653,
        author: 'Orange Open Movie Project',
        formats: [
          { formatId: '1080p-mp4', resolution: '1080p', container: 'mp4', type: 'video', note: '1080p Full HD Video', estimatedSizeMb: 180.2 },
          { formatId: '720p-mp4', resolution: '720p', container: 'mp4', type: 'video', note: '720p HD Video', estimatedSizeMb: 98.0 },
          { formatId: 'm4a-audio', resolution: 'Audio Only', container: 'm4a', type: 'audio', note: 'Original AAC/M4A Audio', estimatedSizeMb: 16.5 }
        ]
      },
      {
        url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/TearsOfSteel.mp4',
        id: 'sample-tears-of-steel',
        title: 'Tears of Steel (Blender VFX Movie)',
        thumbnail: 'https://images.unsplash.com/photo-1578632767115-351597cf2477?w=600&q=80',
        duration: 734,
        author: 'Mango Open Movie Project',
        formats: [
          { formatId: '1080p-mp4', resolution: '1080p', container: 'mp4', type: 'video', note: '1080p HD Sci-Fi Video', estimatedSizeMb: 210.5 },
          { formatId: '720p-mp4', resolution: '720p', container: 'mp4', type: 'video', note: '720p HD Video', estimatedSizeMb: 112.0 },
          { formatId: 'mp3-audio', resolution: 'Audio Only', container: 'mp3', type: 'audio', note: 'Soundtrack MP3', estimatedSizeMb: 18.0 }
        ]
      }
    ];
  }

  canHandle(url) {
    if (!url) return false;
    if (url.toLowerCase().startsWith('sample:') || url.toLowerCase().includes('sample-demo')) {
      return true;
    }
    return this.samples.some(s => url.toLowerCase().includes(s.id) || url === s.url);
  }

  getSamples() {
    return this.samples;
  }

  async analyze(url) {
    // Artificial slight delay to demonstrate UI spinner smoothly
    await new Promise(res => setTimeout(res, 600));

    let sample = this.samples.find(s => url.toLowerCase().includes(s.id) || url === s.url);
    if (!sample) {
      sample = this.samples[0]; // fallback to Big Buck Bunny
    }

    return {
      provider: this.name,
      id: sample.id,
      originalUrl: sample.url,
      title: sample.title,
      thumbnail: sample.thumbnail,
      duration: sample.duration,
      author: sample.author,
      formats: sample.formats
    };
  }

  async download(options, progressCallback, stateManager) {
    const { url, destDir, filename, format } = options;
    let sample = this.samples.find(s => url.toLowerCase().includes(s.id) || url === s.url) || this.samples[0];

    const safeTitle = (filename || sample.title).replace(/[/\\?%*:|"<>]/g, '_');
    const ext = format?.container || 'mp4';
    const outputPath = path.join(destDir, `${safeTitle}.${ext}`);

    const targetUrl = sample.url;
    const client = targetUrl.startsWith('https') ? https : http;

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

      const request = client.get(targetUrl, { headers: reqHeaders }, (response) => {
        if (response.statusCode >= 300 && response.statusCode < 400 && response.headers.location) {
          // Follow redirect
          return this.downloadDirectStream(response.headers.location, outputPath, startByte, progressCallback, stateManager)
            .then(resolve)
            .catch(reject);
        }

        if (response.statusCode !== 200 && response.statusCode !== 206) {
          return reject(new Error(`Server returned status HTTP ${response.statusCode}`));
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
          fileStream.close();
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

module.exports = SampleProvider;
