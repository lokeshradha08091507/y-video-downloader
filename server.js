const express = require('express');
const path = require('path');
const fs = require('fs');
const os = require('os');
const providerManager = require('./src/main/services/ProviderManager');

const app = express();
const PORT = process.env.PORT || 3000;

const https = require('https');
const http = require('http');

// Enable CORS & JSON parsing
app.use(express.json());
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.sendStatus(200);
  next();
});

// Health check endpoint for uptime monitoring & keep-alive
app.get('/health', (req, res) => res.status(200).send('OK'));

// Serve built static frontend files
app.use(express.static(path.join(__dirname, 'dist')));

// API Endpoint: Analyze URL
app.get('/api/analyze', async (req, res) => {
  const targetUrl = req.query.url;
  if (!targetUrl || typeof targetUrl !== 'string' || !targetUrl.trim()) {
    return res.status(400).json({ error: 'Missing or invalid "url" parameter.' });
  }

  try {
    const meta = await providerManager.analyze(targetUrl.trim());
    return res.json(meta);
  } catch (err) {
    console.error('Web Server analyze error:', err.message);
    return res.status(400).json({ error: err.message || 'Failed to analyze video URL.' });
  }
});

// API Endpoint: Stream & Download Video
app.get('/api/download', async (req, res) => {
  const targetUrl = req.query.url;
  const formatId = req.query.formatId || 'b/best';
  const formatType = req.query.type || 'video';
  const title = req.query.title || 'video_download';

  if (!targetUrl || typeof targetUrl !== 'string') {
    return res.status(400).json({ error: 'Missing "url" parameter.' });
  }

  try {
    const provider = providerManager.getProviderForUrl(targetUrl);
    const tmpDir = os.tmpdir();
    const format = { formatId, type: formatType, container: formatType === 'audio' ? 'mp3' : 'mp4' };

    const savedPath = await provider.download(
      { url: targetUrl, destDir: tmpDir, filename: `web_server_${Date.now()}`, format },
      () => {},
      { isCancelled: () => false, isPaused: () => false, onCancel: () => {} }
    );

    if (fs.existsSync(savedPath)) {
      const stat = fs.statSync(savedPath);
      const safeTitle = (title || 'video').replace(/[/\\?%*:|"<>]/g, '_');
      const ext = path.extname(savedPath) || (formatType === 'audio' ? '.mp3' : '.mp4');

      res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(safeTitle)}${ext}"`);
      res.setHeader('Content-Type', formatType === 'audio' ? 'audio/mpeg' : 'video/mp4');
      res.setHeader('Content-Length', stat.size);

      const stream = fs.createReadStream(savedPath);
      stream.pipe(res);
      stream.on('end', () => {
        try { fs.unlinkSync(savedPath); } catch (e) {}
      });
      stream.on('error', (err) => {
        console.error('File stream error:', err);
        try { fs.unlinkSync(savedPath); } catch (e) {}
      });
    } else {
      throw new Error('Downloaded file not found on server');
    }
  } catch (err) {
    console.error('Web Server download error:', err.message);
    if (!res.headersSent) {
      return res.status(500).json({ error: err.message || 'Failed to download video stream.' });
    }
  }
});

// Serve React App SPA fallback for all other routes
app.get('*', (req, res) => {
  const indexHtml = path.join(__dirname, 'dist', 'index.html');
  if (fs.existsSync(indexHtml)) {
    res.sendFile(indexHtml);
  } else {
    res.status(404).send('Application build not found. Please run "npm run build" first.');
  }
});

app.listen(PORT, () => {
  console.log(`================================================`);
  console.log(`🚀 Video Downloader Web Server running on port ${PORT}`);
  console.log(`🌐 Local Access: http://localhost:${PORT}`);
  console.log(`================================================`);

  // Render Keep-Alive Heartbeat: Pings itself every 10 mins to prevent free instance spin-down
  const renderUrl = process.env.RENDER_EXTERNAL_URL;
  if (renderUrl) {
    console.log(`💓 Keep-alive heartbeat active for ${renderUrl}`);
    setInterval(() => {
      const client = renderUrl.startsWith('https') ? https : http;
      client.get(`${renderUrl}/health`, (res) => {
        console.log(`Keep-alive ping sent (Status: ${res.statusCode})`);
      }).on('error', (e) => {
        console.warn('Keep-alive ping error:', e.message);
      });
    }, 10 * 60 * 1000); // Every 10 minutes
  }
});
