import { randomUUID } from 'node:crypto';
import {
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Types } from 'mongoose';
import type {
  AcceptInviteDto,
  ChangePasswordDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
} from '../dto/auth.dto.js';
import { AuthRepository } from '../repositories/auth.repository.js';
import { MembershipsRepository } from '../../memberships/repositories/memberships.repository.js';
import { UsersRepository } from '../../users/repositories/users.repository.js';
import { UserStatus, type User } from '../../users/schemas/user.schema.js';
import { AccessTokenService } from './access-token.service.js';
import { AuthCryptoService } from './auth-crypto.service.js';
import { AuthNotificationService } from './auth-notification.service.js';
import { PasswordService } from './password.service.js';

export interface AuthRequestMetadata {
  ip: string;
  userAgent: string;
}

export interface IssuedAuthTokens {
  accessToken: string;
  refreshToken: string;
  csrfToken: string;
  sessionId: string;
}

@Injectable()
export class AuthService {
  private readonly refreshTtl: number;
  private readonly lockoutAttempts: number;
  private readonly lockoutSeconds: number;
  private readonly resetRevokesAllSessions: boolean;

  constructor(
    config: ConfigService,
    private readonly users: UsersRepository,
    private readonly auth: AuthRepository,
    private readonly memberships: MembershipsRepository,
    private readonly passwords: PasswordService,
    private readonly crypto: AuthCryptoService,
    private readonly accessTokens: AccessTokenService,
    private readonly notifications: AuthNotificationService,
  ) {
    this.refreshTtl = config.getOrThrow<number>('auth.refreshTokenTtlSeconds');
    this.lockoutAttempts = config.getOrThrow<number>('auth.lockoutAttempts');
    this.lockoutSeconds = config.getOrThrow<number>('auth.lockoutSeconds');
    this.resetRevokesAllSessions = config.getOrThrow<boolean>('auth.resetRevokesAllSessions');
  }

  async register(dto: RegisterDto, metadata: AuthRequestMetadata): Promise<void> {
    const email = dto.email.trim().toLowerCase();
    if (await this.users.findByEmailWithSecrets(email)) throw new ConflictException('Account already exists');
    this.assertPasswordDoesNotContainEmail(dto.password, email);
    const passwordHash = await this.passwords.hash(dto.password);
    const user = await this.users.create({
      email,
      displayName: dto.displayName.trim(),
      passwordHash,
      passwordChangedAt: new Date(),
    });
    const token = this.crypto.randomToken();
    await this.auth.createVerificationToken(
      user._id,
      this.crypto.hashToken(token),
      new Date(Date.now() + 86_400_000),
    );
    await Promise.all([
      this.notifications.verification(email, token),
      this.audit(user._id, 'auth.registration', true, metadata),
    ]);
  }

  async login(dto: LoginDto, metadata: AuthRequestMetadata): Promise<IssuedAuthTokens> {
    const email = dto.email.trim().toLowerCase();
    const user = await this.users.findByEmailWithSecrets(email);
    if (!user) {
      await this.passwords.hash(dto.password);
      await this.auth.recordLoginAttempt({
        emailHash: this.crypto.hashToken(email),
        ipHash: this.crypto.hashToken(metadata.ip),
        successful: false,
        failureReason: 'invalid_credentials',
      });
      throw new UnauthorizedException('Invalid credentials');
    }
    if (user.lockedUntil && user.lockedUntil > new Date()) throw new ForbiddenException('Account temporarily locked');
    const validPassword = await this.passwords.verify(user.passwordHash, dto.password);
    if (!validPassword || user.status === UserStatus.Disabled || !user.emailVerifiedAt) {
      await this.users.recordFailedLogin(user, this.lockoutAttempts, this.lockoutSeconds);
      await this.audit(user._id, 'auth.login', false, metadata, 'invalid_credentials');
      throw new UnauthorizedException('Invalid credentials');
    }
    await this.verifySecondFactor(user, dto.secondFactor);
    await this.users.clearLoginFailures(user._id.toString());
    const ipHash = this.crypto.hashToken(metadata.ip);
    const userAgentHash = this.crypto.hashToken(metadata.userAgent);
    const suspicious =
      (await this.auth.hasSessions(user._id.toString())) &&
      !(await this.auth.isKnownDevice(user._id.toString(), ipHash, userAgentHash));
    const tokens = await this.issueSession(user, metadata, suspicious);
    await Promise.all([
      this.auth.recordLoginAttempt({
        emailHash: this.crypto.hashToken(email),
        ipHash: this.crypto.hashToken(metadata.ip),
        successful: true,
      }),
      this.audit(user._id, 'auth.login', true, metadata),
      ...(suspicious
        ? [this.notifications.suspiciousLogin(user.email, new Date().toISOString())]
        : []),
    ]);
    return tokens;
  }

  async refresh(rawToken: string, metadata: AuthRequestMetadata): Promise<IssuedAuthTokens> {
    const tokenHash = this.crypto.hashToken(rawToken);
    const consumed = await this.auth.consumeRefreshToken(tokenHash);
    if (!consumed) {
      const reused = await this.auth.findRefreshToken(tokenHash);
      if (reused) {
        await this.auth.revokeFamily(reused.familyId, 'refresh_token_reuse');
        await this.audit(reused.userId, 'auth.refresh_reuse', false, metadata);
      }
      throw new UnauthorizedException('Invalid refresh token');
    }
    const [user, session] = await Promise.all([
      this.users.findById(consumed.userId.toString()),
      this.auth.findActiveSession(consumed.sessionId.toString()),
    ]);
    if (!user || !session) throw new UnauthorizedException('Session is not active');
    const replacement = this.crypto.randomToken();
    await this.auth.createRefreshToken({
      userId: user._id,
      sessionId: session._id,
      familyId: consumed.familyId,
      tokenHash: this.crypto.hashToken(replacement),
      parentTokenHash: tokenHash,
      expiresAt: new Date(Date.now() + this.refreshTtl * 1_000),
    });
    await this.audit(user._id, 'auth.refresh', true, metadata);
    return this.tokenResponse(user, session._id.toString(), replacement);
  }

  async logout(userId: string, sessionId: string, metadata: AuthRequestMetadata): Promise<void> {
    await this.auth.revokeSession(userId, sessionId, 'logout');
    await this.audit(new Types.ObjectId(userId), 'auth.logout', true, metadata);
  }

  async verifyEmail(rawToken: string, metadata: AuthRequestMetadata): Promise<void> {
    const token = await this.auth.consumeVerificationToken(this.crypto.hashToken(rawToken));
    if (!token) throw new UnauthorizedException('Invalid or expired verification token');
    await this.users.markVerified(token.userId);
    await this.audit(token.userId, 'auth.email_verified', true, metadata);
  }

  async forgotPassword(emailValue: string, metadata: AuthRequestMetadata): Promise<void> {
    const email = emailValue.trim().toLowerCase();
    const user = await this.users.findByEmailWithSecrets(email);
    if (user) {
      const token = this.crypto.randomToken();
      await this.auth.createResetToken(
        user._id,
        this.crypto.hashToken(token),
        new Date(Date.now() + 3_600_000),
      );
      await this.notifications.passwordReset(email, token);
      await this.audit(user._id, 'auth.password_reset_requested', true, metadata);
    }
  }

  async resetPassword(dto: ResetPasswordDto, metadata: AuthRequestMetadata): Promise<void> {
    const token = await this.auth.consumeResetToken(this.crypto.hashToken(dto.token));
    if (!token) throw new UnauthorizedException('Invalid or expired reset token');
    const user = await this.users.findById(token.userId.toString());
    if (!user) throw new UnauthorizedException('Invalid or expired reset token');
    this.assertPasswordDoesNotContainEmail(dto.password, user.email);
    await this.users.update(user._id.toString(), {
      $set: {
        passwordHash: await this.passwords.hash(dto.password),
        passwordChangedAt: new Date(),
        failedLoginCount: 0,
        status: UserStatus.Active,
      },
      $unset: { lockedUntil: 1 },
    });
    if (this.resetRevokesAllSessions) {
      await this.auth.revokeAllSessions(user._id.toString(), 'password_reset');
    }
    await this.audit(user._id, 'auth.password_reset', true, metadata);
  }

  async changePassword(
    userId: string,
    dto: ChangePasswordDto,
    metadata: AuthRequestMetadata,
  ): Promise<void> {
    const user = await this.users.findById(userId, true);
    if (!user || !(await this.passwords.verify(user.passwordHash, dto.currentPassword))) {
      throw new UnauthorizedException('Current password is incorrect');
    }
    this.assertPasswordDoesNotContainEmail(dto.password, user.email);
    await this.users.update(userId, {
      $set: { passwordHash: await this.passwords.hash(dto.password), passwordChangedAt: new Date() },
    });
    await this.auth.revokeAllSessions(userId, 'password_change');
    await this.audit(user._id, 'auth.password_changed', true, metadata);
  }

  async setupTwoFactor(userId: string): Promise<{ secret: string; recoveryCodes: string[] }> {
    const secret = this.crypto.generateTotpSecret();
    const recoveryCodes = Array.from({ length: 10 }, () => this.crypto.randomToken(9));
    await Promise.all([
      this.users.update(userId, { $set: { twoFactorSecretEncrypted: this.crypto.encrypt(secret) } }),
      this.auth.replaceRecoveryCodes(
        userId,
        recoveryCodes.map((code) => this.crypto.hashToken(code)),
      ),
    ]);
    return { secret, recoveryCodes };
  }

  async confirmTwoFactor(userId: string, code: string): Promise<void> {
    const user = await this.users.findById(userId, true);
    if (
      !user?.twoFactorSecretEncrypted ||
      !this.crypto.verifyTotp(this.crypto.decrypt(user.twoFactorSecretEncrypted), code)
    ) {
      throw new UnauthorizedException('Invalid two-factor code');
    }
    await this.users.update(userId, { $set: { twoFactorEnabled: true } });
  }

  async listSessions(userId: string) {
    const sessions = await this.auth.listSessions(userId);
    return sessions.map((session) => ({
      id: session._id.toString(),
      createdAt: session.createdAt.toISOString(),
      lastSeenAt: session.lastSeenAt.toISOString(),
      expiresAt: session.expiresAt.toISOString(),
      revokedAt: session.revokedAt?.toISOString(),
      suspicious: session.suspicious,
    }));
  }

  revokeSession(userId: string, sessionId: string): Promise<boolean> {
    return this.auth.revokeSession(userId, sessionId, 'user_revoked');
  }

  async acceptInvite(userId: string, dto: AcceptInviteDto): Promise<void> {
    const accepted = await this.memberships.acceptInvite(
      userId,
      this.crypto.hashToken(dto.inviteToken),
    );
    if (!accepted) throw new NotFoundException('Invite is invalid or expired');
  }

  private async issueSession(
    user: User,
    metadata: AuthRequestMetadata,
    suspicious: boolean,
  ): Promise<IssuedAuthTokens> {
    const familyId = randomUUID();
    const refreshToken = this.crypto.randomToken();
    const expiresAt = new Date(Date.now() + this.refreshTtl * 1_000);
    const session = await this.auth.createSession({
      userId: user._id,
      tokenFamilyId: familyId,
      ipHash: this.crypto.hashToken(metadata.ip),
      userAgentHash: this.crypto.hashToken(metadata.userAgent),
      expiresAt,
      lastSeenAt: new Date(),
      suspicious,
    });
    await this.auth.createRefreshToken({
      userId: user._id,
      sessionId: session._id,
      familyId,
      tokenHash: this.crypto.hashToken(refreshToken),
      expiresAt,
    });
    return this.tokenResponse(user, session._id.toString(), refreshToken);
  }

  private tokenResponse(user: User, sessionId: string, refreshToken: string): IssuedAuthTokens {
    return {
      accessToken: this.accessTokens.sign({
        sub: user._id.toString(),
        sid: sessionId,
        adm: user.platformAdmin,
        pwd: Math.floor(user.passwordChangedAt.getTime() / 1_000),
      }),
      refreshToken,
      csrfToken: this.crypto.randomToken(),
      sessionId,
    };
  }

  private async verifySecondFactor(user: User, factor?: string): Promise<void> {
    if (!user.twoFactorEnabled) return;
    if (!factor || !user.twoFactorSecretEncrypted) throw new UnauthorizedException('Two-factor code required');
    if (this.crypto.verifyTotp(this.crypto.decrypt(user.twoFactorSecretEncrypted), factor)) return;
    const recovery = await this.auth.consumeRecoveryCode(
      user._id.toString(),
      this.crypto.hashToken(factor),
    );
    if (!recovery) throw new UnauthorizedException('Invalid two-factor code');
  }

  private assertPasswordDoesNotContainEmail(password: string, email: string): void {
    const localPart = email.split('@')[0] ?? '';
    if (localPart.length >= 3 && password.toLowerCase().includes(localPart.toLowerCase())) {
      throw new ForbiddenException('Password must not contain the email address');
    }
  }

  private audit(
    userId: Types.ObjectId | undefined,
    action: string,
    successful: boolean,
    metadata: AuthRequestMetadata,
    metadataCode?: string,
  ): Promise<void> {
    return this.auth.recordAudit({
      ...(userId ? { userId } : {}),
      action,
      successful,
      ipHash: this.crypto.hashToken(metadata.ip),
      ...(metadataCode ? { metadataCode } : {}),
    });
  }
}
