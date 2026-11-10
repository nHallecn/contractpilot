import { verifyResponse } from './contract.js';

/**
 * Executes an explicitly supplied, in-process test adapter.
 * No arbitrary repository code is executed; sandboxed repo execution is a later milestone.
 */
export async function evaluateCase({ spec, method, path, request, handler }) {
  if (typeof handler !== 'function') throw new TypeError('A trusted handler function is required');
  try {
    const response = await handler(request);
    return verifyResponse({ spec, method, path, response });
  } catch (error) {
    return { state: 'UNKNOWN', violations: [{ code: 'HANDLER_ERROR', message: String(error?.message || 'Handler failed') }] };
  }
}
