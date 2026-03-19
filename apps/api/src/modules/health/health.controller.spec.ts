import { HealthController } from './health.controller';

describe('HealthController', () => {
  it('returns a healthy payload', () => {
    const controller = new HealthController();
    const result = controller.getHealth();

    expect(result.status).toBe('ok');
    expect(result.service).toBe('api');
    expect(typeof result.timestamp).toBe('string');
  });
});
