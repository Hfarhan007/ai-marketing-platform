import { createHash } from 'node:crypto';
import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import type { Queue } from 'bullmq';

@Injectable()
export class AuthNotificationService {
  constructor(@InjectQueue('auth-notifications') private readonly queue: Queue) {}

  async verification(email: string, token: string): Promise<void> {
    await this.queue.add(
      'email-verification',
      { email, token },
      { jobId: `verify:${this.hash(token)}` },
    );
  }

  async passwordReset(email: string, token: string): Promise<void> {
    await this.queue.add(
      'password-reset',
      { email, token },
      { jobId: `reset:${this.hash(token)}` },
    );
  }

  async suspiciousLogin(email: string, occurredAt: string): Promise<void> {
    await this.queue.add(
      'suspicious-login',
      { email, occurredAt },
      { jobId: `suspicious:${this.hash(email)}:${occurredAt}` },
    );
  }

  private hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }
}
