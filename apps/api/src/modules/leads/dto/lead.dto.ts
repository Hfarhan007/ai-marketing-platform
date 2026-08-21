import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsEmail,
  IsInt,
  IsMongoId,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
export class CreateLeadDto {
  @IsOptional() @IsObject() customFields: Record<string, unknown> = {};
  @IsString() @MaxLength(200) name!: string;
  @IsOptional() @IsEmail() email = '';
  @IsOptional() @IsString() phone = '';
  @IsOptional() @IsString() source = 'manual';
  @IsOptional() @IsMongoId() campaignId?: string;
  @IsOptional() @IsNumber() @Min(0) @Max(100) score = 0;
  @IsOptional() @IsString() qualification = 'unqualified';
  @IsOptional() @IsString() status = 'new';
  @IsOptional() @IsMongoId() ownerId?: string;
  @IsOptional() @Type(() => Date) @IsDate() followUpAt?: Date;
  @IsOptional() @IsString() disqualificationReason?: string;
  @IsOptional() @IsArray() @IsMongoId({ each: true }) aiSummaryReferenceIds: string[] = [];
  @IsOptional() @IsArray() @IsString({ each: true }) tags: string[] = [];
}
export class UpdateLeadDto extends CreateLeadDto {
  @IsInt() @Min(0) version!: number;
}
export class ConvertLeadDto {
  @IsInt() @Min(0) version!: number;
  @IsOptional() @IsMongoId() pipelineId?: string;
  @IsOptional() @IsMongoId() stageId?: string;
  @IsOptional() @IsNumber() @Min(0) dealValue = 0;
  @IsOptional() @IsString() @MaxLength(3) currency = 'USD';
}
export class QualifyLeadDto {
  @IsString() @MaxLength(20_000) text!: string;
  @IsOptional() @IsMongoId() leadId?: string;
}
