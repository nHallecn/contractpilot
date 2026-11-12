import { createHash } from 'node:crypto';
import { verifyResponse } from './contract.js';

/**
 * Dedicated HTTP probe for a trusted example server. It accepts no caller-supplied URL,
 * ensuring the evaluation cannot be repurposed for requests to arbitrary networks.
 */
export async function probeExampleApi({ endpoint, spec, timeoutMs = 2000 }) {
  const url = new URL(endpoint);
  if (url.protocol !== 'http:' || url.hostname !== '127.0.0.1' ||
      url.pathname !== '/payments' || url.search || url.hash ||
      !Number.isInteger(timeoutMs) || timeoutMs < 1 || timeoutMs > 10_000) {
    throw new TypeError('Only the approved loopback example endpoint is supported');
  }
  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json', accept: 'application/json' },
      body: JSON.stringify({ amount: 500 }),
      signal: AbortSignal.timeout(timeoutMs),
      redirect: 'error'
    });
    const rawBody = await response.text();
    const contentType = response.headers.get('content-type') || '';
    const evidence = {
      method: 'POST',
      path: '/payments',
      status: response.status,
      contentType,
      bodySha256: createHash('sha256').update(rawBody).digest('hex'),
      bytes: Buffer.byteLength(rawBody)
    };
    if (!/^application\/json(?:\s*;|\s*$)/i.test(contentType)) {
      return { state: 'FAIL', violations: [{ code: 'UNEXPECTED_CONTENT_TYPE' }], evidence };
    }
    const result = verifyResponse({
      spec, method: 'post', path: '/payments',
      response: { status: response.status, body: rawBody }
    });
    return { ...result, evidence };
  } catch (error) {
    return {
      state: 'UNKNOWN',
      violations: [{ code: 'HTTP_PROBE_ERROR', message: String(error?.name || 'Connection failure') }],
      evidence: null
    };
  }
}
