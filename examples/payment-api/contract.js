/** Approved contract for the demonstration payment endpoint. */
export const paymentContract = Object.freeze({
  openapi: '3.0.3',
  paths: {
    '/payments': {
      post: {
        responses: {
          '201': {
            content: {
              'application/json': {
                schema: {
                  type: 'object',
                  required: ['paymentId'],
                  properties: { paymentId: { type: 'string' } }
                }
              }
            }
          }
        }
      }
    }
  }
});
