import {
  IsArray,
  IsInt,
  IsMongoId,
  IsObject,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';
export class CreateAppointmentDto {
  @IsOptional() @IsObject() customFields: Record<string, unknown> = {};
  @IsMongoId() customerId!: string;
  @IsMongoId() staffId!: string;
  @IsMongoId() serviceId!: string;
  @IsString() start!: string;
  @IsString() end!: string;
  @IsString() timezone!: string;
  @IsOptional() @IsString() @MaxLength(300) location = '';
  @IsOptional() @IsString() @MaxLength(2048) meetingLink = '';
  @IsOptional() @IsArray() @IsInt({ each: true }) reminders: number[] = [];
  @IsOptional() @IsString() @MaxLength(5000) notes = '';
  @IsString() @MaxLength(200) idempotencyKey!: string;
}
export class RescheduleAppointmentDto {
  @IsString() start!: string;
  @IsString() end!: string;
  @IsString() timezone!: string;
  @IsInt() @Min(0) version!: number;
  @IsString() @MaxLength(200) idempotencyKey!: string;
}
export class CancelAppointmentDto {
  @IsString() @MaxLength(500) reason!: string;
  @IsInt() @Min(0) version!: number;
}
