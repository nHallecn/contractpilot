export async function createPayment(request) {
  if (!Number.isInteger(request?.amount) || request.amount < 1) {
    return { status: 400, body: { error: 'Invalid amount' } };
  }
  return { status: 200, body: { ok: true } };
}
