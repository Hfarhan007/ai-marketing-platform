import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { WorkspacesModule } from '../workspaces/workspaces.module.js';
import { MembershipsController } from './controllers/memberships.controller.js';
import { MembershipsRepository } from './repositories/memberships.repository.js';
import { Membership, MembershipSchema } from './schemas/membership.schema.js';
import { MembershipsService } from './services/memberships.service.js';

@Module({
  imports: [
    MongooseModule.forFeature([{ name: Membership.name, schema: MembershipSchema }]),
    WorkspacesModule,
  ],
  controllers: [MembershipsController],
  providers: [MembershipsRepository, MembershipsService],
  exports: [MembershipsRepository],
})
export class MembershipsModule {}
