import { Type } from 'class-transformer';
import { IsArray, IsDate, IsIn, IsInt, IsMongoId, IsNumber, IsObject, IsOptional, IsString, Length, Max, Min } from 'class-validator';
export class CreateDealDto {
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
  @IsOptional() @IsArray() @IsObject({ each: true }) lineItems: Record<string, string | number>[] = [];
}
export class UpdateDealDto extends CreateDealDto { @IsInt() @Min(0) version!: number; }
export class TransitionDealDto {
  @IsInt() @Min(0) version!: number;
  @IsIn(['won', 'lost']) status!: 'won' | 'lost';
  @IsString() reason!: string;
}
