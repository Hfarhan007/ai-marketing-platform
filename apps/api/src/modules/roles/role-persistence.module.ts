import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { RolesRepository } from './repositories/roles.repository.js';
import { Role, RoleSchema } from './schemas/role.schema.js';

@Module({
  imports: [MongooseModule.forFeature([{ name: Role.name, schema: RoleSchema }])],
  providers: [RolesRepository],
  exports: [RolesRepository],
})
export class RolePersistenceModule {}
