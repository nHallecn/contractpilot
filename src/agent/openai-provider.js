/**
 * Explicitly opted-in OpenAI Responses adapter.
 * A provider may propose text only; it never executes code or adjudicates contract validity.
 */
export function createOpenAIProposalGenerator({
  apiKey, model, fetchImpl = fetch, timeoutMs = 20000
}) {
  if (typeof apiKey !== 'string' || !apiKey.trim()) throw new Error('OPENAI_API_KEY_REQUIRED');
  if (typeof model !== 'string' || !/^[a-zA-Z0-9_.-]{2,80}$/.test(model)) {
    throw new Error('INVALID_OPENAI_MODEL');
  }
  if (typeof fetchImpl !== 'function' || !Number.isSafeInteger(timeoutMs) ||
      timeoutMs < 1000 || timeoutMs > 60000) throw new TypeError('INVALID_PROVIDER_OPTIONS');

  return async function generate(prompt) {
    if (typeof prompt !== 'string' || prompt.length < 1 || prompt.length > 50000) {
      throw new TypeError('INVALID_PROMPT');
    }
    let response;
    try {
      response = await fetchImpl('https://api.openai.com/v1/responses', {
        method: 'POST',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json'
        },
        body: JSON.stringify({
          model,
          store: false,
          max_output_tokens: 1200,
          input: [
            { role: 'developer', content: 'Return only a JSON object with exactly two string properties, before and after. No markdown. Never request or emit executable commands.' },
            { role: 'user', content: prompt }
          ]
        }),
        signal: AbortSignal.timeout(timeoutMs),
        redirect: 'error'
      });
    } catch {
      throw new Error('MODEL_TRANSPORT_ERROR');
    }
    if (!response.ok) throw new Error(`MODEL_HTTP_${response.status}`);
    let payload;
    try {
      const raw = await response.text();
      if (raw.length > 100000) throw new Error('oversized');
      payload = JSON.parse(raw);
    } catch {
      throw new Error('INVALID_MODEL_PAYLOAD');
    }
    if (payload.status && payload.status !== 'completed') throw new Error('INCOMPLETE_MODEL_RESPONSE');
    const chunks = [];
    for (const item of payload.output || []) {
      if (item?.type !== 'message' || item.role !== 'assistant') continue;
      for (const part of item.content || []) {
        if (part?.type === 'output_text' && typeof part.text === 'string') chunks.push(part.text);
      }
    }
    if (chunks.length !== 1 || chunks[0].length > 4096) throw new Error('INVALID_MODEL_OUTPUT');
    return chunks[0];
  };
}
