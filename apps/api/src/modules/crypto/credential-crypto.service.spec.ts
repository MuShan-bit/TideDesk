import { ConfigService } from '@nestjs/config';
import { CredentialCryptoService } from './credential-crypto.service';

describe('CredentialCryptoService', () => {
  const configService = {
    getOrThrow: jest.fn().mockReturnValue('replace-with-32-byte-secret'),
  } as unknown as ConfigService;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('encrypts and decrypts payloads', () => {
    const service = new CredentialCryptoService(configService);
    const plainText = JSON.stringify({ token: 'secret-token' });

    const encrypted = service.encrypt(plainText);
    const decrypted = service.decrypt(encrypted);

    expect(encrypted).not.toBe(plainText);
    expect(decrypted).toBe(plainText);
  });

  it('supports empty string payloads', () => {
    const service = new CredentialCryptoService(configService);

    const encrypted = service.encrypt('');

    expect(service.decrypt(encrypted)).toBe('');
  });

  it('throws when encryption key is unavailable', () => {
    const brokenConfigService = {
      getOrThrow: jest.fn(() => {
        throw new Error('Missing encryption key');
      }),
    } as unknown as ConfigService;
    const service = new CredentialCryptoService(brokenConfigService);

    expect(() => service.encrypt('demo')).toThrow('Missing encryption key');
    expect(() => service.decrypt('demo')).toThrow('Missing encryption key');
  });

  it('throws when decrypting with a different key', () => {
    const service = new CredentialCryptoService(configService);
    const encrypted = service.encrypt('demo-payload');
    const otherConfigService = {
      getOrThrow: jest.fn().mockReturnValue('another-secret-key'),
    } as unknown as ConfigService;
    const serviceWithDifferentKey = new CredentialCryptoService(
      otherConfigService,
    );

    expect(() => serviceWithDifferentKey.decrypt(encrypted)).toThrow();
  });
});
