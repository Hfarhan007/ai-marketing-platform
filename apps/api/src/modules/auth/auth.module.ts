import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { MembershipsModule } from '../memberships/memberships.module.js';
import { UsersModule } from '../users/users.module.js';
import { AuthController } from './controllers/auth.controller.js';
import { AuthenticationGuard } from './guards/authentication.guard.js';
import { CsrfGuard } from './guards/csrf.guard.js';
import { AuthRepository } from './repositories/auth.repository.js';
import { AuthAuditEventRecord, AuthAuditEventSchema } from './schemas/auth-audit-event.schema.js';
import { AuthSession, AuthSessionSchema } from './schemas/auth-session.schema.js';
import {
  EmailVerificationToken,
  EmailVerificationTokenSchema,
  PasswordResetToken,
  PasswordResetTokenSchema,
} from './schemas/auth-token.schema.js';
import { LoginAttempt, LoginAttemptSchema } from './schemas/login-attempt.schema.js';
import { RefreshTokenRecord, RefreshTokenSchema } from './schemas/refresh-token.schema.js';
import {
  TwoFactorRecoveryCode,
  TwoFactorRecoveryCodeSchema,
} from './schemas/two-factor-recovery-code.schema.js';
import { AccessTokenService } from './services/access-token.service.js';
import { AuthCryptoService } from './services/auth-crypto.service.js';
import { AuthNotificationService } from './services/auth-notification.service.js';
import { AuthService } from './services/auth.service.js';
import { PasswordService } from './services/password.service.js';

@Module({
  imports: [
    UsersModule,
    MembershipsModule,
    BullModule.registerQueue({ name: 'auth-notifications' }),
    MongooseModule.forFeature([
      { name: AuthSession.name, schema: AuthSessionSchema },
      { name: RefreshTokenRecord.name, schema: RefreshTokenSchema },
      { name: EmailVerificationToken.name, schema: EmailVerificationTokenSchema },
      { name: PasswordResetToken.name, schema: PasswordResetTokenSchema },
      { name: TwoFactorRecoveryCode.name, schema: TwoFactorRecoveryCodeSchema },
      { name: LoginAttempt.name, schema: LoginAttemptSchema },
      { name: AuthAuditEventRecord.name, schema: AuthAuditEventSchema },
    ]),
  ],
  controllers: [AuthController],
  providers: [
    AuthRepository,
    AuthService,
    PasswordService,
    AuthCryptoService,
    AccessTokenService,
    AuthNotificationService,
    AuthenticationGuard,
    CsrfGuard,
  ],
  exports: [AuthRepository, AuthService, AuthCryptoService, AccessTokenService],
})
export class AuthModule {}
