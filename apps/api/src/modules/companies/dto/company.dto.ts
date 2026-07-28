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
export class CreateCompanyDto {
  @IsString() @MaxLength(200) name!: string;
  @IsOptional() @IsString() @MaxLength(253) domain = '';
  @IsOptional() @IsString() industry = '';
  @IsOptional() @IsString() size = '';
  @IsOptional() @IsString() revenueRange = '';
  @IsOptional() @IsMongoId() ownerId?: string;
  @IsOptional() @IsArray() @IsObject({ each: true }) addresses: Record<string, string>[] = [];
  @IsOptional() @IsArray() @IsMongoId({ each: true }) contactIds: string[] = [];
  @IsOptional() @IsArray() @IsMongoId({ each: true }) dealIds: string[] = [];
  @IsOptional() @IsArray() @IsString({ each: true }) tags: string[] = [];
  @IsOptional() @IsObject() customFields: Record<string, unknown> = {};
  @IsOptional() @IsMongoId() parentCompanyId?: string;
  @IsOptional() @IsArray() @IsObject({ each: true }) contactRoles: {
    contactId: string;
    role: string;
  }[] = [];
}
export class UpdateCompanyDto extends CreateCompanyDto {
  @IsInt() @Min(0) version!: number;
}
