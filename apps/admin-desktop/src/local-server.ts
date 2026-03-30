import { createReadStream } from 'node:fs';
import { access, stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';

export interface LocalStaticServer {
  close(): Promise<void>;
  url: string;
}

const CONTENT_TYPES: Record<string, string> = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.map': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

export async function startLocalStaticServer(rootDir: string): Promise<LocalStaticServer> {
  const normalizedRoot = path.resolve(rootDir);

  const server = createServer(async (request, response) => {
    try {
      const requestPath = request.url ? new URL(request.url, 'http://127.0.0.1').pathname : '/';
      const pathname = decodeURIComponent(requestPath);
      const candidatePath = pathname === '/' ? '/index.html' : pathname;
      const targetFile = resolveSafePath(normalizedRoot, candidatePath);
      const filePath = await resolveExistingFile(targetFile, normalizedRoot);
      const extension = path.extname(filePath).toLowerCase();

      response.writeHead(200, {
        'Cache-Control': extension === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
        'Content-Type': CONTENT_TYPES[extension] ?? 'application/octet-stream',
      });

      const stream = createReadStream(filePath);
      stream.on('error', (error) => {
        console.error('Stream error serving file:', error);
        if (!response.headersSent) {
          response.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
        }
        response.end('Internal server error');
      });
      stream.pipe(response);
    } catch (error) {
      console.error('Error serving static file:', error);
      response.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
      response.end('Not found');
    }
  });

  await new Promise<void>((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', () => {
      server.off('error', reject);
      resolve();
    });
  });

  const address = server.address();
  if (!address || typeof address === 'string') {
    throw new Error('Local static server did not expose a TCP address.');
  }

  return {
    url: `http://127.0.0.1:${address.port}`,
    close: async () => {
      await new Promise<void>((resolve, reject) => {
        server.close((error) => {
          if (error) {
            reject(error);
            return;
          }

          resolve();
        });
      });
    },
  };
}

async function resolveExistingFile(requestedPath: string, rootDir: string) {
  if (await isReadableFile(requestedPath)) {
    return requestedPath;
  }

  return path.join(rootDir, 'index.html');
}

async function isReadableFile(filePath: string) {
  try {
    await access(filePath);
    const details = await stat(filePath);
    return details.isFile();
  } catch {
    return false;
  }
}

function resolveSafePath(rootDir: string, requestPath: string) {
  const relativePath = requestPath.replace(/^\/+/, '');
  const resolvedPath = path.resolve(rootDir, relativePath);

  if (!resolvedPath.startsWith(rootDir)) {
    throw new Error('Attempted path traversal outside of the renderer root.');
  }

  return resolvedPath;
}
