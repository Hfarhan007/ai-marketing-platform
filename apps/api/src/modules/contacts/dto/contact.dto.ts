import { Type } from 'class-transformer';
import { IsArray, IsBoolean, IsInt, IsMongoId, IsObject, IsOptional, IsString, MaxLength, Min, ValidateNested } from 'class-validator';

export class ContactPointDto {
  @IsString() @MaxLength(254) value!: string;
  @IsOptional() @IsString() @MaxLength(30) label = 'other';
  @IsOptional() @IsBoolean() primary = false;
}
export class CreateContactDto {
  @IsOptional() @IsString() @MaxLength(100) firstName = '';
  @IsOptional() @IsString() @MaxLength(100) lastName = '';
  @IsString() @MaxLength(200) displayName!: string;
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ContactPointDto) emailAddresses: ContactPointDto[] = [];
  @IsOptional() @IsArray() @ValidateNested({ each: true }) @Type(() => ContactPointDto) phoneNumbers: ContactPointDto[] = [];
  @IsOptional() @IsArray() @IsObject({ each: true }) addresses: Record<string, string>[] = [];
  @IsOptional() @IsArray() @IsString({ each: true }) tags: string[] = [];
  @IsOptional() @IsObject() customFields: Record<string, unknown> = {};
  @IsOptional() @IsString() @MaxLength(100) source = 'manual';
  @IsOptional() @IsMongoId() ownerId?: string;
  @IsOptional() @IsArray() @IsMongoId({ each: true }) companyIds: string[] = [];
  @IsOptional() @IsObject() communicationPreferences: Record<string, boolean> = {};
  @IsOptional() @IsObject() consentSummary: Record<string, string | boolean> = {};
  @IsOptional() @IsString() lifecycleStatus = 'subscriber';
}
export class UpdateContactDto extends CreateContactDto {
  @IsInt() @Min(0) version!: number;
}
export class MergeContactsDto {
  @IsMongoId() sourceId!: string;
  @IsMongoId() targetId!: string;
  @IsInt() @Min(0) sourceVersion!: number;
  @IsInt() @Min(0) targetVersion!: number;
}
