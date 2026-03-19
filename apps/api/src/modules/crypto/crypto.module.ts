import { Module } from '@nestjs/common';
import { CredentialCryptoService } from './credential-crypto.service';

@Module({
  providers: [CredentialCryptoService],
  exports: [CredentialCryptoService],
})
export class CryptoModule {}
