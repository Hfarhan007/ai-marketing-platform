import { IsArray, IsInt, IsMongoId, IsObject, IsOptional, IsString, Min } from 'class-validator';
export class CreateAvailabilityDto {
 @IsMongoId() staffId!:string; @IsString() timezone!:string;
 @IsArray() @IsObject({each:true}) workingHours!:Record<string,number|boolean>[];
 @IsOptional() @IsArray() @IsObject({each:true}) dateOverrides:Record<string,string|number|boolean>[]=[];
 @IsOptional() @IsArray() @IsObject({each:true}) breaks:Record<string,number>[]=[];
 @IsOptional() @IsArray() @IsString({each:true}) holidays:string[]=[];
 @IsOptional() @IsInt() @Min(0) bufferBeforeMinutes=0; @IsOptional() @IsInt() @Min(0) bufferAfterMinutes=0;
 @IsOptional() @IsInt() @Min(0) minimumNoticeMinutes=0; @IsOptional() @IsInt() @Min(1) bookingHorizonDays=90;
}
export class UpdateAvailabilityDto extends CreateAvailabilityDto { @IsInt() @Min(0) version!:number; }
