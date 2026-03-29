const http = require('http');
const fs = require('fs');
const path = require('path');

const port = process.env.PORT || 4173;
const host = process.env.HOST || '127.0.0.1';
const root = __dirname;
const workspaceRoot = path.dirname(root);
const specialFiles = {
  '/ranch coordinates.kml': path.join(workspaceRoot, 'ranch coordinates.kml'),
  '/zones.kml': path.join(workspaceRoot, 'zones.kml'),
};

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.kml': 'application/vnd.google-earth.kml+xml; charset=utf-8',
  '.svg': 'image/svg+xml; charset=utf-8',
};

http
  .createServer((req, res) => {
    const requestPath = req.url === '/' ? '/index.html' : decodeURIComponent(req.url);
    const specialFilePath = specialFiles[requestPath];
    const filePath = specialFilePath || path.join(root, requestPath.replace(/^\//, ''));

    if (!specialFilePath && !filePath.startsWith(root)) {
      res.writeHead(403);
      res.end('Forbidden');
      return;
    }

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(404);
        res.end('Not found');
        return;
      }

      const ext = path.extname(filePath);
      res.writeHead(200, {
        'Content-Type': mimeTypes[ext] || 'application/octet-stream',
        'Cache-Control': 'no-store, no-cache, must-revalidate',
        Pragma: 'no-cache',
        Expires: '0',
      });
      res.end(data);
    });
  })
  .listen(port, host, () => {
    console.log(`Bakki UI prototype available at http://${host}:${port}`);
  });
