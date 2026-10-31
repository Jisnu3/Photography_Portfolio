const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 4173;
const MIME = {
  '.html': 'text/html',
  '.css': 'text/css',
  '.js': 'text/javascript',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.json': 'application/json'
};

const server = http.createServer((req, res) => {
  // Enable CORS for all requests
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.setHeader('Pragma', 'no-cache');
  res.setHeader('Expires', '0');

  if (req.method === 'OPTIONS') {
    res.writeHead(204);
    res.end();
    return;
  }

  let reqPath = decodeURI(req.url.split('?')[0]);

  // Image Upload API Endpoint
  if (req.method === 'POST' && reqPath === '/api/upload') {
    let body = [];
    req.on('data', chunk => body.push(chunk));
    req.on('end', () => {
      try {
        const parsed = JSON.parse(Buffer.concat(body).toString());
        const originalName = (parsed.filename || 'photo.jpg').replace(/[^a-zA-Z0-9._-]/g, '_');
        const uniqueName = `${Date.now()}_${originalName}`;
        const uploadDir = path.join(__dirname, 'assets', 'images', 'uploads');

        if (!fs.existsSync(uploadDir)) {
          fs.mkdirSync(uploadDir, { recursive: true });
        }

        const filePath = path.join(uploadDir, uniqueName);

        let base64Data = parsed.data || '';
        if (base64Data.includes('base64,')) {
          base64Data = base64Data.split('base64,')[1];
        }

        fs.writeFileSync(filePath, Buffer.from(base64Data, 'base64'));
        const relativeUrl = `assets/images/uploads/${uniqueName}`;
        const sizeKb = (fs.statSync(filePath).size / 1024).toFixed(1);
        console.log(`[Upload API] Saved photo: ${relativeUrl} (${sizeKb} KB)`);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: true, url: relativeUrl, filename: uniqueName }));
      } catch (err) {
        console.error('[Upload API Error]', err);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ success: false, error: err.message }));
      }
    });
    return;
  }

  // Static File Serving
  if (reqPath === '/' || reqPath === '') reqPath = '/index.html';
  const filePath = path.join(__dirname, reqPath);

  if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Not Found');
    return;
  }

  const ext = path.extname(filePath).toLowerCase();
  const contentType = MIME[ext] || 'application/octet-stream';
  res.writeHead(200, { 'Content-Type': contentType });
  fs.createReadStream(filePath).pipe(res);
});

server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
