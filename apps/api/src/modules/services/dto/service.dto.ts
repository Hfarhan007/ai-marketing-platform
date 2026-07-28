import { IsBoolean, IsInt, IsNumber, IsOptional, IsString, Length, Min } from 'class-validator';
export class CreateBookingServiceDto {
 @IsString() name!:string; @IsOptional() @IsString() description='';
 @IsInt() @Min(5) durationMinutes!:number; @IsOptional() @IsNumber() @Min(0) price=0;
 @IsOptional() @IsString() @Length(3,3) currency='USD';
 @IsOptional() @IsInt() @Min(0) bufferBeforeMinutes=0; @IsOptional() @IsInt() @Min(0) bufferAfterMinutes=0;
 @IsOptional() @IsBoolean() active=true;
}
export class UpdateBookingServiceDto extends CreateBookingServiceDto { @IsInt() @Min(0) version!:number; }
