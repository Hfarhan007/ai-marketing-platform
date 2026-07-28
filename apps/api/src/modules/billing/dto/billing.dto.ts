import {
  IsEmail,
  IsEnum,
  IsInt,
  IsMongoId,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
import {
  USAGE_CATEGORIES,
  type BillingInterval,
  type UsageCategory,
} from '../schemas/billing.schemas.js';
export class StartSubscriptionDto {
  @IsMongoId() planId!: string;
  @IsEnum(['month', 'year']) interval!: BillingInterval;
  @IsEmail() billingEmail!: string;
  @IsOptional() @IsString() @MaxLength(100) billingName?: string;
  @IsOptional() @IsString() @MaxLength(50) coupon?: string;
  @IsString() @MaxLength(100) idempotencyKey!: string;
}
export class ChangePlanDto {
  @IsMongoId() planId!: string;
  @IsString() @MaxLength(100) idempotencyKey!: string;
}
export class CancelSubscriptionDto {
  @IsOptional() atPeriodEnd = true;
}
export class RecordUsageDto {
  @IsEnum(USAGE_CATEGORIES) category!: UsageCategory;
  @IsInt() @Min(1) quantity!: number;
  @IsString() @MaxLength(100) idempotencyKey!: string;
}
