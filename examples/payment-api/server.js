import { createServer } from 'node:http';

/**
 * Trusted fixture HTTP service bound to loopback only.
 * NOT a sandbox for arbitrary repository code.
 */
export async function startExampleApi(handler) {
  if (typeof handler !== 'function') throw new TypeError('handler must be a function');
  const server = createServer(async (req, res) => {
    if (req.method !== 'POST' || req.url !== '/payments') {
      res.writeHead(404, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'Not found' }));
      return;
    }
    let raw = '';
    try {
      for await (const chunk of req) {
        raw += chunk;
        if (Buffer.byteLength(raw) > 16_384) throw new Error('Request too large');
      }
      const payload = JSON.parse(raw);
      const result = await handler(payload);
      if (!Number.isInteger(result?.status) || result.status < 100 || result.status > 599) {
        throw new Error('Invalid handler status');
      }
      res.writeHead(result.status, { 'content-type': 'application/json' });
      res.end(JSON.stringify(result.body));
    } catch {
      res.writeHead(400, { 'content-type': 'application/json' });
      res.end(JSON.stringify({ error: 'Invalid request' }));
    }
  });
  try {
    await new Promise((resolve, reject) => {
      server.once('error', reject);
      server.listen(0, '127.0.0.1', resolve);
    });
  } catch (error) {
    server.close();
    throw error;
  }
  const address = server.address();
  return {
    endpoint: `http://127.0.0.1:${address.port}/payments`,
    async close() {
      await new Promise((resolve, reject) => server.close(error => error ? reject(error) : resolve()));
    }
  };
}
