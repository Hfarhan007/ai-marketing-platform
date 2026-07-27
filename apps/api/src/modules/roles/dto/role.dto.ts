import { ArrayMaxSize, ArrayUnique, IsArray, IsIn, IsMongoId, IsString, Matches, MaxLength, MinLength } from 'class-validator';
import {
  PERMISSIONS,
  PERMISSION_GROUPS,
  type Permission,
  type PermissionGroup,
} from '../../permissions/constants/permission.catalog.js';

export class CreateRoleDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;
  @IsString()
  @Matches(/^[a-z][a-z0-9_-]{1,79}$/u)
  key!: string;
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(50)
  @IsIn(PERMISSIONS, { each: true })
  permissions!: Permission[];
  @IsArray()
  @ArrayUnique()
  @ArrayMaxSize(20)
  @IsIn(Object.keys(PERMISSION_GROUPS), { each: true })
  permissionGroups!: PermissionGroup[];
}

export class AssignRolesDto {
  @IsMongoId({ each: true })
  @ArrayUnique()
  @ArrayMaxSize(20)
  roleIds!: string[];
}
