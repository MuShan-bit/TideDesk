import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  createCipheriv,
  createDecipheriv,
  createHash,
  randomBytes,
} from 'crypto';

@Injectable()
export class CredentialCryptoService {
  constructor(private readonly configService: ConfigService) {}

  encrypt(plainText: string) {
    const iv = randomBytes(16);
    const key = this.getKey();
    const cipher = createCipheriv('aes-256-gcm', key, iv);
    const encrypted = Buffer.concat([
      cipher.update(plainText, 'utf8'),
      cipher.final(),
    ]);
    const authTag = cipher.getAuthTag();

    return Buffer.concat([iv, authTag, encrypted]).toString('base64');
  }

  decrypt(payload: string) {
    const buffer = Buffer.from(payload, 'base64');
    const iv = buffer.subarray(0, 16);
    const authTag = buffer.subarray(16, 32);
    const encrypted = buffer.subarray(32);
    const key = this.getKey();
    const decipher = createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]).toString('utf8');
  }

  private getKey() {
    const secret = this.configService.getOrThrow<string>(
      'CREDENTIAL_ENCRYPTION_KEY',
    );

    return createHash('sha256').update(secret).digest();
  }
}
