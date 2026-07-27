import { Body, Controller, Delete, Get, HttpCode, Inject, Param, Patch, Post, Req, Res, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Throttle } from '@nestjs/throttler';
import { ACCESS_COOKIE, CSRF_COOKIE, REFRESH_COOKIE } from '../../../common/constants/auth.constants.js';
import { CurrentPrincipal } from '../../../common/decorators/current-principal.decorator.js';
import { Public } from '../../../common/decorators/public.decorator.js';
import { RequireCsrf } from '../../../common/decorators/require-csrf.decorator.js';
import type { AuthenticatedPrincipal } from '../../../common/types/authenticated-principal.js';
import {
  AcceptInviteDto,
  ChangePasswordDto,
  EmailDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  TokenDto,
  TwoFactorCodeDto,
} from '../dto/auth.dto.js';
import { AuthService, type AuthRequestMetadata, type IssuedAuthTokens } from '../services/auth.service.js';

interface AuthHttpRequest {
  cookies?: Record<string, string | undefined>;
  headers: Record<string, string | string[] | undefined>;
  ip: string;
}

interface CookieOptions {
  httpOnly?: boolean;
  secure: boolean;
  sameSite: 'strict';
  path: string;
  maxAge?: number;
}

interface AuthHttpReply {
  setCookie(name: string, value: string, options: CookieOptions): void;
  clearCookie(name: string, options: Pick<CookieOptions, 'path' | 'secure' | 'sameSite'>): void;
}

@Controller('auth')
export class AuthController {
  private readonly secure: boolean;
  private readonly refreshTtl: number;

  constructor(
    @Inject(AuthService) private readonly auth: AuthService,
    @Inject(ConfigService) config: ConfigService,
  ) {
    this.secure = config.getOrThrow<boolean>('auth.cookieSecure');
    this.refreshTtl = config.getOrThrow<number>('auth.refreshTokenTtlSeconds');
  }

  @Public()
  @Post('register')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async register(@Body() dto: RegisterDto, @Req() request: AuthHttpRequest): Promise<{ message: string }> {
    await this.auth.register(dto, this.metadata(request));
    return { message: 'Registration accepted. Check your email to verify the account.' };
  }

  @Public()
  @Post('login')
  @HttpCode(200)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async login(
    @Body() dto: LoginDto,
    @Req() request: AuthHttpRequest,
    @Res({ passthrough: true }) reply: AuthHttpReply,
  ): Promise<{ sessionId: string }> {
    const tokens = await this.auth.login(dto, this.metadata(request));
    this.setAuthCookies(reply, tokens);
    return { sessionId: tokens.sessionId };
  }

  @Public()
  @RequireCsrf()
  @Post('refresh')
  @HttpCode(200)
  async refresh(
    @Req() request: AuthHttpRequest,
    @Res({ passthrough: true }) reply: AuthHttpReply,
  ): Promise<{ sessionId: string }> {
    const refreshToken = request.cookies?.[REFRESH_COOKIE];
    if (!refreshToken) throw new UnauthorizedException('Refresh cookie is missing');
    const tokens = await this.auth.refresh(refreshToken, this.metadata(request));
    this.setAuthCookies(reply, tokens);
    return { sessionId: tokens.sessionId };
  }

  @RequireCsrf()
  @Post('logout')
  @HttpCode(204)
  async logout(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Req() request: AuthHttpRequest,
    @Res({ passthrough: true }) reply: AuthHttpReply,
  ): Promise<void> {
    await this.auth.logout(principal.userId, principal.sessionId, this.metadata(request));
    this.clearAuthCookies(reply);
  }

  @Public()
  @Post('email/verify')
  async verifyEmail(@Body() dto: TokenDto, @Req() request: AuthHttpRequest): Promise<{ message: string }> {
    await this.auth.verifyEmail(dto.token, this.metadata(request));
    return { message: 'Email verified' };
  }

  @Public()
  @Post('password/forgot')
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  async forgotPassword(@Body() dto: EmailDto, @Req() request: AuthHttpRequest): Promise<{ message: string }> {
    await this.auth.forgotPassword(dto.email, this.metadata(request));
    return { message: 'If the account exists, password reset instructions will be sent.' };
  }

  @Public()
  @Post('password/reset')
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async resetPassword(@Body() dto: ResetPasswordDto, @Req() request: AuthHttpRequest): Promise<{ message: string }> {
    await this.auth.resetPassword(dto, this.metadata(request));
    return { message: 'Password reset completed' };
  }

  @RequireCsrf()
  @Patch('password')
  async changePassword(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Body() dto: ChangePasswordDto,
    @Req() request: AuthHttpRequest,
  ): Promise<{ message: string }> {
    await this.auth.changePassword(principal.userId, dto, this.metadata(request));
    return { message: 'Password changed; existing sessions were revoked' };
  }

  @RequireCsrf()
  @Post('2fa/setup')
  setupTwoFactor(@CurrentPrincipal() principal: AuthenticatedPrincipal) {
    return this.auth.setupTwoFactor(principal.userId);
  }

  @RequireCsrf()
  @Post('2fa/confirm')
  async confirmTwoFactor(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Body() dto: TwoFactorCodeDto,
  ): Promise<{ message: string }> {
    await this.auth.confirmTwoFactor(principal.userId, dto.code);
    return { message: 'Two-factor authentication enabled' };
  }

  @Get('sessions')
  listSessions(@CurrentPrincipal() principal: AuthenticatedPrincipal) {
    return this.auth.listSessions(principal.userId);
  }

  @RequireCsrf()
  @Delete('sessions/:sessionId')
  async revokeSession(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Param('sessionId') sessionId: string,
  ): Promise<{ revoked: boolean }> {
    return { revoked: await this.auth.revokeSession(principal.userId, sessionId) };
  }

  @RequireCsrf()
  @Post('invites/accept')
  async acceptInvite(
    @CurrentPrincipal() principal: AuthenticatedPrincipal,
    @Body() dto: AcceptInviteDto,
  ): Promise<{ message: string }> {
    await this.auth.acceptInvite(principal.userId, dto);
    return { message: 'Invite accepted' };
  }

  private metadata(request: AuthHttpRequest): AuthRequestMetadata {
    const userAgent = request.headers['user-agent'];
    return { ip: request.ip, userAgent: typeof userAgent === 'string' ? userAgent : 'unknown' };
  }

  private setAuthCookies(reply: AuthHttpReply, tokens: IssuedAuthTokens): void {
    reply.setCookie(ACCESS_COOKIE, tokens.accessToken, {
      httpOnly: true, secure: this.secure, sameSite: 'strict', path: '/', maxAge: 900,
    });
    reply.setCookie(REFRESH_COOKIE, tokens.refreshToken, {
      httpOnly: true, secure: this.secure, sameSite: 'strict', path: '/api/v1/auth/refresh', maxAge: this.refreshTtl,
    });
    reply.setCookie(CSRF_COOKIE, tokens.csrfToken, {
      httpOnly: false, secure: this.secure, sameSite: 'strict', path: '/', maxAge: this.refreshTtl,
    });
  }

  private clearAuthCookies(reply: AuthHttpReply): void {
    const base = { secure: this.secure, sameSite: 'strict' as const };
    reply.clearCookie(ACCESS_COOKIE, { ...base, path: '/' });
    reply.clearCookie(REFRESH_COOKIE, { ...base, path: '/api/v1/auth/refresh' });
    reply.clearCookie(CSRF_COOKIE, { ...base, path: '/' });
  }
}
