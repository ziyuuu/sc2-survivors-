import { createReadStream, statSync } from 'node:fs';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { resolve, dirname } from 'node:path';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const gamePath = resolve(root, 'dist/SC2-Survivors-Demo.html');
const port = Number.parseInt(process.env.PORT || '3000', 10);

if (!Number.isInteger(port) || port < 1 || port > 65535) {
  throw new Error('PORT must be an integer between 1 and 65535');
}

let gameSize;
try {
  gameSize = statSync(gamePath).size;
} catch {
  throw new Error(`Missing playable build: ${gamePath}`);
}

if (gameSize < 300 * 1024 * 1024) {
  throw new Error(`Playable build is too small (${gameSize} bytes); Git LFS may not have fetched it`);
}

const server = createServer((request, response) => {
  if (request.url === '/health') {
    response.writeHead(200, { 'Content-Type': 'text/plain; charset=utf-8' });
    response.end('ok');
    return;
  }

  if ((request.url !== '/' && request.url !== '/index.html') ||
      (request.method !== 'GET' && request.method !== 'HEAD')) {
    response.writeHead(404);
    response.end();
    return;
  }

  response.writeHead(200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Content-Length': gameSize,
    'Cache-Control': 'public, max-age=3600',
  });
  if (request.method === 'HEAD') {
    response.end();
    return;
  }

  const stream = createReadStream(gamePath);
  stream.on('error', () => response.destroy());
  request.on('close', () => stream.destroy());
  stream.pipe(response);
});

server.listen(port, '0.0.0.0', () => {
  process.stdout.write(`Serving SC2 Survivors on port ${port}\n`);
});
