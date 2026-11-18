import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';

const root = '/workspace/artifacts';
const types = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.zip': 'application/zip',
  '.pdf': 'application/pdf',
  '.png': 'image/png',
  '.svg': 'image/svg+xml'
};

const server = http.createServer((req, res) => {
  const url = new URL(req.url || '/', 'http://localhost');
  let name = decodeURIComponent(url.pathname);
  if (name === '/' || name === '/index.html') name = '/cube_with_pyramids.html';
  const file = path.normalize(path.join(root, name));
  if (!file.startsWith(root)) {
    res.writeHead(403);
    res.end('forbidden');
    return;
  }
  fs.readFile(file, (err, data) => {
    if (err) {
      res.writeHead(404);
      res.end('not found');
      return;
    }
    res.writeHead(200, { 'Content-Type': types[path.extname(file)] || 'application/octet-stream' });
    res.end(data);
  });
});

server.listen(8080, '0.0.0.0');
