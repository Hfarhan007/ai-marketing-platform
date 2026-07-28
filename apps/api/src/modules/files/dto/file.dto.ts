import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  Min,
} from 'class-validator';
export class InitiateUploadDto {
  @IsString() @MaxLength(255) originalName!: string;
  @IsString() @MaxLength(150) declaredMimeType!: string;
  @IsInt() @Min(1) size!: number;
  @IsString() @Matches(/^[a-fA-F0-9]{64}$/u) checksum!: string;
  @IsOptional() @IsString() @MaxLength(200) folder = '';
  @IsOptional() @IsArray() @ArrayMaxSize(20) @IsString({ each: true }) tags: string[] = [];
}
export class CompleteUploadDto {
  @IsString() @Matches(/^[a-fA-F0-9]{64}$/u) checksum!: string;
}
export class UsageReferenceDto {
  @IsString() @MaxLength(100) type!: string;
  @IsString() @MaxLength(200) id!: string;
}
