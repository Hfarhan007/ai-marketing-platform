import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types, type Model } from 'mongoose';
import { User, UserStatus } from '../schemas/user.schema.js';

@Injectable()
export class UsersRepository {
  constructor(@InjectModel(User.name) private readonly users: Model<User>) {}

  create(input: Pick<User, 'email' | 'passwordHash' | 'displayName' | 'passwordChangedAt'>): Promise<User> {
    return this.users.create(input).then((user) => user.toObject());
  }

  findByEmailWithSecrets(email: string): Promise<User | null> {
    return this.users
      .findOne({ email: email.toLowerCase() })
      .select('+passwordHash +twoFactorSecretEncrypted')
      .lean<User>()
      .exec();
  }

  findById(userId: string, secrets = false): Promise<User | null> {
    if (!Types.ObjectId.isValid(userId)) return Promise.resolve(null);
    const query = this.users.findById(userId);
    if (secrets) query.select('+passwordHash +twoFactorSecretEncrypted');
    return query.lean<User>().exec();
  }

  update(userId: string, update: Record<string, unknown>): Promise<User | null> {
    return this.users.findByIdAndUpdate(userId, update, { new: true, runValidators: true }).lean<User>().exec();
  }

  async recordFailedLogin(user: User, lockoutAttempts: number, lockoutSeconds: number): Promise<void> {
    const failedLoginCount = user.failedLoginCount + 1;
    const shouldLock = failedLoginCount >= lockoutAttempts;
    await this.users.updateOne({ _id: user._id }, {
      $set: {
        failedLoginCount,
        ...(shouldLock
          ? {
              status: UserStatus.Locked,
              lockedUntil: new Date(Date.now() + lockoutSeconds * 1_000),
            }
          : {}),
      },
    });
  }

  async clearLoginFailures(userId: string): Promise<void> {
    await this.users.updateOne(
      { _id: new Types.ObjectId(userId) },
      { $set: { failedLoginCount: 0, status: UserStatus.Active }, $unset: { lockedUntil: 1 } },
    );
  }

  markVerified(userId: Types.ObjectId): Promise<User | null> {
    return this.users.findByIdAndUpdate(userId, {
      $set: { emailVerifiedAt: new Date(), status: UserStatus.Active },
    }, { new: true }).lean<User>().exec();
  }
}
