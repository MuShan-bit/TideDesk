import { redactSensitiveResponse } from './sensitive-response';

describe('redactSensitiveResponse', () => {
  it('removes sensitive fields from nested objects and arrays', () => {
    const createdAt = new Date('2026-03-19T00:00:00.000Z');
    const payload = {
      id: 'binding-001',
      authPayloadEncrypted: 'encrypted-binding-payload',
      apiKeyEncrypted: 'encrypted-provider-api-key',
      cookies: [
        {
          name: 'auth_token',
          value: 'secret-cookie',
        },
      ],
      createdAt,
      binding: {
        id: 'binding-001',
        capturedPayloadEncrypted: 'encrypted-browser-session-payload',
        authToken: 'auth-token',
        apiKey: 'raw-api-key',
        username: 'demo_user',
      },
      items: [
        {
          id: 'run-001',
          ct0: 'ct0-token',
          status: 'SUCCESS',
        },
      ],
    };

    expect(redactSensitiveResponse(payload)).toEqual({
      id: 'binding-001',
      createdAt,
      binding: {
        id: 'binding-001',
        username: 'demo_user',
      },
      items: [
        {
          id: 'run-001',
          status: 'SUCCESS',
        },
      ],
    });
  });
});
