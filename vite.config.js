import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import path from 'path';
import { createRequire } from 'module';

const require = createRequire(import.meta.url);

function apiServerPlugin() {
  return {
    name: 'api-server-plugin',
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        try {
          const host = req.headers.host || 'localhost:5173';
          const urlObj = new URL(req.url, `http://${host}`);

          if (urlObj.pathname === '/api/analyze') {
            const targetUrl = urlObj.searchParams.get('url');
            if (!targetUrl) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Missing url parameter' }));
              return;
            }

            const providerManager = require('./src/main/services/ProviderManager');
            const meta = await providerManager.analyze(targetUrl);
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify(meta));
            return;
          }

          if (urlObj.pathname === '/api/download') {
            const targetUrl = urlObj.searchParams.get('url');
            const formatId = urlObj.searchParams.get('formatId');
            const formatType = urlObj.searchParams.get('type') || 'video';
            const title = urlObj.searchParams.get('title') || 'video_download';

            if (!targetUrl) {
              res.statusCode = 400;
              res.setHeader('Content-Type', 'application/json');
              res.end(JSON.stringify({ error: 'Missing url parameter' }));
              return;
            }

            const providerManager = require('./src/main/services/ProviderManager');
            const provider = providerManager.getProviderForUrl(targetUrl);
            const os = require('os');
            const fs = require('fs');

            const tmpDir = os.tmpdir();
            const format = { formatId, type: formatType, container: formatType === 'audio' ? 'mp3' : 'mp4' };

            const savedPath = await provider.download(
              { url: targetUrl, destDir: tmpDir, filename: `web_dl_${Date.now()}`, format },
              () => {},
              { isCancelled: () => false, isPaused: () => false, onCancel: () => {} }
            );

            if (fs.existsSync(savedPath)) {
              const stat = fs.statSync(savedPath);
              const safeName = (title || 'video').replace(/[/\\?%*:|"<>]/g, '_');
              const ext = path.extname(savedPath) || (formatType === 'audio' ? '.mp3' : '.mp4');

              res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(safeName)}${ext}"`);
              res.setHeader('Content-Type', formatType === 'audio' ? 'audio/mpeg' : 'video/mp4');
              res.setHeader('Content-Length', stat.size);

              const readStream = fs.createReadStream(savedPath);
              readStream.pipe(res);
              readStream.on('end', () => {
                try { fs.unlinkSync(savedPath); } catch (e) {}
              });
            } else {
              throw new Error('Downloaded temp file not found on server');
            }
            return;
          }
        } catch (err) {
          console.error('Vite API Middleware Error:', err);
          if (!res.headersSent) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            res.end(JSON.stringify({ error: err.message || 'Internal Server Error' }));
          }
          return;
        }

        next();
      });
    }
  };
}

export default defineConfig({
  plugins: [react(), apiServerPlugin()],
  base: './',
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/renderer'),
    },
  },
  server: {
    port: 5173,
    strictPort: false,
  },
});
