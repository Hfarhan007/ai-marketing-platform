import { randomBytes } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { argon2id, argon2Verify } from 'hash-wasm';

@Injectable()
export class PasswordService {
  hash(password: string): Promise<string> {
    return argon2id({
      password,
      salt: randomBytes(16),
      iterations: 3,
      memorySize: 65_536,
      parallelism: 1,
      hashLength: 32,
      outputType: 'encoded',
    });
  }

  verify(hashValue: string, password: string): Promise<boolean> {
    return argon2Verify({ hash: hashValue, password });
  }
}
