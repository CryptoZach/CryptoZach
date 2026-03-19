/**
 * Minimal static server on port 8080.
 * Run: npm run serve
 */
const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = 8080;
const root = path.join(__dirname, '..');

const server = http.createServer((req, res) => {
  const url = req.url || '/';
  const pathname = url.split('?')[0];
  let decoded = pathname;
  try { decoded = decodeURIComponent(pathname); } catch (_) {}
  const rawPath = path.join(root, pathname === '/' ? 'index.html' : pathname.replace(/^\//, ''));
  const filePath = path.join(root, decoded === '/' ? 'index.html' : decoded.replace(/^\//, ''));
  const sendFile = (p) => {
    const stream = fs.createReadStream(p);
    stream.on('error', (err) => {
      if (!res.headersSent) {
        res.statusCode = 404;
        res.setHeader('Content-Type', 'text/plain');
      }
      res.end('Not found');
    });
    stream.on('open', () => {
      if (!res.headersSent) {
        res.setHeader('Content-Type', getMime(p));
        stream.pipe(res);
      }
    });
  };

  fs.stat(filePath, (err, stat) => {
    if (err) {
      if (pathname === '/' || pathname.endsWith('/')) {
        const indexPath = path.join(pathname === '/' ? root : filePath, 'index.html');
        return fs.stat(indexPath, (e2, s2) => {
          if (e2 || !s2 || !s2.isFile()) {
            res.statusCode = 404;
            res.end('Not found');
            return;
          }
          sendFile(indexPath);
        });
      }
      res.statusCode = 404;
      res.end('Not found');
      return;
    }
    if (stat.isDirectory()) {
      const indexInDir = path.join(filePath, 'index.html');
      return fs.stat(indexInDir, (e2, s2) => {
        if (e2 || !s2 || !s2.isFile()) {
          res.statusCode = 404;
          res.end('Not found');
          return;
        }
        sendFile(indexInDir);
      });
    }
    sendFile(filePath);
  });
});

function getMime(filePath) {
  const ext = path.extname(filePath);
  const m = { '.html': 'text/html', '.css': 'text/css', '.js': 'application/javascript', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.pdf': 'application/pdf', '.docx': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' };
  return m[ext] || 'application/octet-stream';
}

server.listen(PORT, '0.0.0.0', () => {
  console.log('Serving at http://localhost:' + PORT);
});

server.on('error', (err) => {
  if (err.code === 'EADDRINUSE') {
    console.error('Port ' + PORT + ' is in use. Stop the other process (e.g. kill the PID using port ' + PORT + ') then run again.');
  } else {
    console.error('Server error', err.message);
  }
  process.exitCode = 1;
});
