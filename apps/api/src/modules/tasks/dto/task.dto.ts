import { Type } from 'class-transformer';
import {
  IsArray,
  IsDate,
  IsIn,
  IsInt,
  IsMongoId,
  IsObject,
  IsOptional,
  IsString,
  Min,
} from 'class-validator';
export class CreateTaskDto {
  @IsOptional() @IsObject() customFields: Record<string, unknown> = {};
  @IsString() title!: string;
  @IsOptional() @IsString() description = '';
  @IsOptional() @IsIn(['open', 'in_progress', 'completed', 'cancelled']) status = 'open';
  @IsOptional() @IsIn(['low', 'normal', 'high', 'urgent']) priority = 'normal';
  @IsOptional() @Type(() => Date) @IsDate() dueAt?: Date;
  @IsOptional() @IsString() timezone = 'UTC';
  @IsOptional() @IsArray() @IsInt({ each: true }) reminders: number[] = [];
  @IsOptional() @IsMongoId() ownerId?: string;
  @IsOptional() @IsMongoId() contactId?: string;
  @IsOptional() @IsMongoId() companyId?: string;
  @IsOptional() @IsMongoId() dealId?: string;
  @IsOptional() @IsArray() @IsObject({ each: true }) checklist: Record<string, string | boolean>[] =
    [];
  @IsOptional() @IsMongoId() parentTaskId?: string;
  @IsOptional() @IsArray() @IsMongoId({ each: true }) subtaskIds: string[] = [];
  @IsOptional() @IsObject() recurrence?: Record<string, string | number>;
}
export class UpdateTaskDto extends CreateTaskDto {
  @IsInt() @Min(0) version!: number;
}
