import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Types, type Model } from 'mongoose';
import { AuthAuditEventRecord } from '../schemas/auth-audit-event.schema.js';
import { AuthSession } from '../schemas/auth-session.schema.js';
import { EmailVerificationToken, PasswordResetToken } from '../schemas/auth-token.schema.js';
import { LoginAttempt } from '../schemas/login-attempt.schema.js';
import { RefreshTokenRecord } from '../schemas/refresh-token.schema.js';
import { TwoFactorRecoveryCode } from '../schemas/two-factor-recovery-code.schema.js';

@Injectable()
export class AuthRepository {
  constructor(
    @InjectModel(AuthSession.name) private readonly sessions: Model<AuthSession>,
    @InjectModel(RefreshTokenRecord.name) private readonly refreshTokens: Model<RefreshTokenRecord>,
    @InjectModel(EmailVerificationToken.name)
    private readonly verificationTokens: Model<EmailVerificationToken>,
    @InjectModel(PasswordResetToken.name)
    private readonly resetTokens: Model<PasswordResetToken>,
    @InjectModel(TwoFactorRecoveryCode.name)
    private readonly recoveryCodes: Model<TwoFactorRecoveryCode>,
    @InjectModel(LoginAttempt.name) private readonly loginAttempts: Model<LoginAttempt>,
    @InjectModel(AuthAuditEventRecord.name) private readonly auditEvents: Model<AuthAuditEventRecord>,
  ) {}

  createSession(input: Omit<AuthSession, '_id' | 'createdAt' | 'updatedAt'>): Promise<AuthSession> {
    return this.sessions.create(input).then((record) => record.toObject());
  }

  createRefreshToken(input: Omit<RefreshTokenRecord, '_id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    return this.refreshTokens.create(input).then(() => undefined);
  }

  consumeRefreshToken(tokenHash: string): Promise<RefreshTokenRecord | null> {
    return this.refreshTokens.findOneAndUpdate(
      { tokenHash, usedAt: null, revokedAt: null, expiresAt: { $gt: new Date() } },
      { $set: { usedAt: new Date() } },
      { new: false },
    ).select('+tokenHash').lean<RefreshTokenRecord>().exec();
  }

  findRefreshToken(tokenHash: string): Promise<RefreshTokenRecord | null> {
    return this.refreshTokens.findOne({ tokenHash }).select('+tokenHash').lean<RefreshTokenRecord>().exec();
  }

  async revokeFamily(familyId: string, reason: string): Promise<void> {
    const now = new Date();
    await Promise.all([
      this.refreshTokens.updateMany({ familyId, revokedAt: null }, { $set: { revokedAt: now } }),
      this.sessions.updateMany({ tokenFamilyId: familyId, revokedAt: null }, {
        $set: { revokedAt: now, revokeReason: reason },
      }),
    ]);
  }

  findActiveSession(sessionId: string): Promise<AuthSession | null> {
    if (!Types.ObjectId.isValid(sessionId)) return Promise.resolve(null);
    return this.sessions.findOne({
      _id: new Types.ObjectId(sessionId),
      revokedAt: null,
      expiresAt: { $gt: new Date() },
    }).lean<AuthSession>().exec();
  }

  async isKnownDevice(userId: string, ipHash: string, userAgentHash: string): Promise<boolean> {
    const known = await this.sessions.exists({
      userId: new Types.ObjectId(userId),
      ipHash,
      userAgentHash,
      revokedAt: null,
    });
    return known !== null;
  }

  async hasSessions(userId: string): Promise<boolean> {
    return (await this.sessions.exists({ userId: new Types.ObjectId(userId) })) !== null;
  }

  listSessions(userId: string): Promise<AuthSession[]> {
    return this.sessions.find({ userId: new Types.ObjectId(userId), expiresAt: { $gt: new Date() } })
      .sort({ lastSeenAt: -1 }).lean<AuthSession[]>().exec();
  }

  async revokeSession(userId: string, sessionId: string, reason: string): Promise<boolean> {
    if (!Types.ObjectId.isValid(sessionId)) return false;
    const session = await this.sessions.findOneAndUpdate(
      { _id: new Types.ObjectId(sessionId), userId: new Types.ObjectId(userId), revokedAt: null },
      { $set: { revokedAt: new Date(), revokeReason: reason } },
      { new: true },
    ).lean<AuthSession>().exec();
    if (!session) return false;
    await this.revokeFamily(session.tokenFamilyId, reason);
    return true;
  }

  async revokeAllSessions(userId: string, reason: string): Promise<void> {
    const sessions = await this.sessions.find({ userId: new Types.ObjectId(userId), revokedAt: null })
      .select('tokenFamilyId').lean<AuthSession[]>().exec();
    await Promise.all(sessions.map((session) => this.revokeFamily(session.tokenFamilyId, reason)));
  }

  async createVerificationToken(userId: Types.ObjectId, tokenHash: string, expiresAt: Date): Promise<void> {
    await this.verificationTokens.create({ userId, tokenHash, expiresAt });
  }

  consumeVerificationToken(tokenHash: string): Promise<EmailVerificationToken | null> {
    return this.verificationTokens.findOneAndUpdate(
      { tokenHash, usedAt: null, expiresAt: { $gt: new Date() } },
      { $set: { usedAt: new Date() } },
      { new: false },
    ).select('+tokenHash').lean<EmailVerificationToken>().exec();
  }

  async createResetToken(userId: Types.ObjectId, tokenHash: string, expiresAt: Date): Promise<void> {
    await this.resetTokens.updateMany({ userId, usedAt: null }, { $set: { usedAt: new Date() } });
    await this.resetTokens.create({ userId, tokenHash, expiresAt });
  }

  consumeResetToken(tokenHash: string): Promise<PasswordResetToken | null> {
    return this.resetTokens.findOneAndUpdate(
      { tokenHash, usedAt: null, expiresAt: { $gt: new Date() } },
      { $set: { usedAt: new Date() } },
      { new: false },
    ).select('+tokenHash').lean<PasswordResetToken>().exec();
  }

  async replaceRecoveryCodes(userId: string, codeHashes: readonly string[]): Promise<void> {
    await this.recoveryCodes.deleteMany({ userId: new Types.ObjectId(userId) });
    await this.recoveryCodes.insertMany(
      codeHashes.map((codeHash) => ({ userId: new Types.ObjectId(userId), codeHash })),
    );
  }

  consumeRecoveryCode(userId: string, codeHash: string): Promise<TwoFactorRecoveryCode | null> {
    return this.recoveryCodes.findOneAndUpdate(
      { userId: new Types.ObjectId(userId), codeHash, usedAt: null },
      { $set: { usedAt: new Date() } },
      { new: false },
    ).select('+codeHash').lean<TwoFactorRecoveryCode>().exec();
  }

  recordLoginAttempt(input: Omit<LoginAttempt, '_id' | 'createdAt'>): Promise<void> {
    return this.loginAttempts.create(input).then(() => undefined);
  }

  recordAudit(input: Omit<AuthAuditEventRecord, '_id' | 'createdAt'>): Promise<void> {
    return this.auditEvents.create(input).then(() => undefined);
  }
}
