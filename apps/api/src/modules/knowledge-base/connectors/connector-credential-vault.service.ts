import { Injectable } from '@nestjs/common';
import { AuthCryptoService } from '../../auth/services/auth-crypto.service.js';
@Injectable()
export class ConnectorCredentialVaultService {
  constructor(private readonly crypto: AuthCryptoService) {}
  seal(value: Record<string, unknown>) {
    return this.crypto.encrypt(JSON.stringify(value));
  }
  open(value: string) {
    const parsed = JSON.parse(this.crypto.decrypt(value)) as unknown;
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed))
      throw new Error('Invalid connector credential payload');
    return parsed as Record<string, unknown>;
  }
}
