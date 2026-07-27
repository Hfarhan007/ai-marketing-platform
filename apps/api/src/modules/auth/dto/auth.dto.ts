import {
  IsEmail,
  IsMongoId,
  IsOptional,
  IsString,
  Length,
  Matches,
  MaxLength,
  MinLength,
} from 'class-validator';

export class PasswordDto {
  @IsString()
  @MinLength(12)
  @MaxLength(128)
  @Matches(/[a-z]/u, { message: 'password must contain a lowercase letter' })
  @Matches(/[A-Z]/u, { message: 'password must contain an uppercase letter' })
  @Matches(/\d/u, { message: 'password must contain a number' })
  @Matches(/[^A-Za-z0-9]/u, { message: 'password must contain a symbol' })
  password!: string;
}

export class RegisterDto extends PasswordDto {
  @IsEmail()
  @MaxLength(320)
  email!: string;
  @IsString()
  @MinLength(1)
  @MaxLength(120)
  displayName!: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;
  @IsString()
  password!: string;
  @IsOptional()
  @IsString()
  @Length(6, 64)
  secondFactor?: string;
}

export class EmailDto {
  @IsEmail()
  email!: string;
}

export class TokenDto {
  @IsString()
  @MinLength(32)
  token!: string;
}

export class ResetPasswordDto extends PasswordDto {
  @IsString()
  @MinLength(32)
  token!: string;
}

export class ChangePasswordDto extends PasswordDto {
  @IsString()
  currentPassword!: string;
}

export class TwoFactorCodeDto {
  @IsString()
  @Length(6, 64)
  code!: string;
}

export class RevokeSessionDto {
  @IsMongoId()
  sessionId!: string;
}

export class AcceptInviteDto {
  @IsString()
  @MinLength(32)
  inviteToken!: string;
}
