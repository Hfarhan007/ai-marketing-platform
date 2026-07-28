import { Type } from 'class-transformer';
import {
  IsArray,
  IsBoolean,
  IsDate,
  IsIn,
  IsInt,
  IsMongoId,
  IsNumber,
  IsObject,
  IsOptional,
  IsString,
  Length,
  Max,
  Min,
} from 'class-validator';
export class CreateDealDto {
  @IsOptional() @IsObject() customFields: Record<string, unknown> = {};
  @IsString() title!: string;
  @IsNumber() @Min(0) value!: number;
  @IsString() @Length(3, 3) currency!: string;
  @IsMongoId() pipelineId!: string;
  @IsMongoId() stageId!: string;
  @IsOptional() @IsNumber() @Min(0) @Max(100) probability = 0;
  @IsOptional() @IsMongoId() ownerId?: string;
  @IsOptional() @IsMongoId() contactId?: string;
  @IsOptional() @IsMongoId() companyId?: string;
  @IsOptional() @Type(() => Date) @IsDate() expectedCloseDate?: Date;
  @IsOptional() @IsArray() @IsObject({ each: true }) lineItems: Record<string, string | number>[] =
    [];
  @IsOptional() @IsIn(['not_required', 'pending', 'approved', 'rejected']) approvalStatus =
    'not_required';
}
export class UpdateDealDto extends CreateDealDto {
  @IsInt() @Min(0) version!: number;
}
export class TransitionDealDto {
  @IsInt() @Min(0) version!: number;
  @IsIn(['open', 'won', 'lost']) status!: 'open' | 'won' | 'lost';
  @IsString() reason!: string;
  @IsOptional() @IsBoolean() allowReopen = false;
}
