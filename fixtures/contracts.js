const object = (required, properties) => ({ type: 'object', required, properties });
const string = { type: 'string' };
const integer = { type: 'integer' };
export const fixtures = [
  {
    name: 'payment-created',
    spec: { openapi: '3.0.3', paths: { '/payments': { post: { responses: {
      '201': { content: { 'application/json': { schema: object(['paymentId'], { paymentId: string }) } } }
    } } } } },
    method: 'post', path: '/payments', request: { amount: 500 },
    broken: async () => ({ status: 200, body: { ok: true } }),
    fixed: async () => ({ status: 201, body: { paymentId: 'pay_001' } }),
    expectedFailure: 'UNEXPECTED_STATUS'
  },
  {
    name: 'account-required-balance',
    spec: { openapi: '3.0.3', paths: { '/accounts': { get: { responses: {
      '200': { content: { 'application/json': { schema: object(['id', 'balance'], { id: string, balance: integer }) } } }
    } } } } },
    method: 'get', path: '/accounts', request: {},
    broken: async () => ({ status: 200, body: { id: 'acc_1' } }),
    fixed: async () => ({ status: 200, body: { id: 'acc_1', balance: 0 } }),
    expectedFailure: 'MISSING_REQUIRED'
  },
  {
    name: 'shipment-state-type',
    spec: { openapi: '3.0.3', paths: { '/shipments': { get: { responses: {
      '200': { content: { 'application/json': { schema: object(['state'], { state: string }) } } }
    } } } } },
    method: 'get', path: '/shipments', request: {},
    broken: async () => ({ status: 200, body: { state: 42 } }),
    fixed: async () => ({ status: 200, body: { state: 'in_transit' } }),
    expectedFailure: 'TYPE_MISMATCH'
  }
];
