import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SchedulingModule } from '../scheduling/scheduling.module.js';
import { AvailabilityController } from './controllers/availability.controller.js';
import { AvailabilityRepository } from './repositories/availability.repository.js';
import { Availability, AvailabilitySchema } from './schemas/availability.schema.js';
import { AvailabilityService } from './services/availability.service.js';
@Module({ imports: [MongooseModule.forFeature([{ name: Availability.name, schema: AvailabilitySchema }]), SchedulingModule], controllers: [AvailabilityController], providers: [AvailabilityRepository, AvailabilityService], exports: [AvailabilityRepository] })
export class AvailabilityModule {}
