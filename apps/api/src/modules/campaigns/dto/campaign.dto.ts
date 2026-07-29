import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsIn,
  IsInt,
  IsMongoId,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  ValidateNested,
} from 'class-validator';
import { CAMPAIGN_CHANNELS } from '../schemas/campaign.schemas.js';
class VariantDto {
  @IsString() id!: string;
  @IsInt() @Min(1) @Max(100) weight!: number;
  @IsOptional() @IsString() subject?: string;
  @IsString() @MaxLength(50000) content!: string;
}
export class CreateCampaignDto {
  @IsString() @MaxLength(200) name!: string;
  @IsIn(CAMPAIGN_CHANNELS) channel!: 'email' | 'sms' | 'whatsapp' | 'social';
  @IsIn(['transactional', 'marketing'])
  communicationType: 'transactional' | 'marketing' = 'marketing';
  @IsOptional() @IsMongoId() audienceId?: string;
  @IsOptional() @IsMongoId() segmentId?: string;
  @IsString() timezone = 'UTC';
  @IsArray()
  @ArrayMaxSize(10)
  @ValidateNested({ each: true })
  @Type(() => VariantDto)
  variants!: VariantDto[];
  @IsOptional() @IsObject() personalizationDefaults: Record<string, string> = {};
  @IsOptional() @IsObject() quietHours: Record<string, number> = {
    startMinutes: 1320,
    endMinutes: 480,
  };
}
export class ScheduleCampaignDto {
  @IsString() scheduledAt!: string;
  @IsString() @MaxLength(200) idempotencyKey!: string;
}
export class TestSendDto {
  @IsString() address!: string;
  @IsOptional() @IsObject() personalization: Record<string, string> = {};
}
export class RunCommandDto {
  @IsIn(['pause', 'resume', 'cancel']) command!: 'pause' | 'resume' | 'cancel';
}
export class MetricDto {
  @IsIn(['sent', 'delivered', 'opened', 'clicked', 'converted', 'failed']) eventType!: string;
  @IsOptional() @IsString() conversionEventId?: string;
}
