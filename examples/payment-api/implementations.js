/**
 * Independent, reviewable source implementations for an illustrative API.
 * The benchmark does not edit application code; it compares two checked-in revisions.
 */
export async function brokenPaymentHandler(request) {
  if (!Number.isInteger(request?.amount) || request.amount < 1) {
    return { status: 400, body: { error: 'Invalid amount' } };
  }
  return { status: 200, body: { ok: true } };
}

export async function correctedPaymentHandler(request) {
  if (!Number.isInteger(request?.amount) || request.amount < 1) {
    return { status: 400, body: { error: 'Invalid amount' } };
  }
  return { status: 201, body: { paymentId: 'pay_demo_001' } };
}

export async function incompletePaymentHandler(request) {
  if (!Number.isInteger(request?.amount) || request.amount < 1) {
    return { status: 400, body: { error: 'Invalid amount' } };
  }
  return { status: 201, body: { ok: true } };
}
