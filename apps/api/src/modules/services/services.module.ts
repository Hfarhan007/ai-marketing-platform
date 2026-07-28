import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SchedulingModule } from '../scheduling/scheduling.module.js';
import { ServicesController } from './controllers/services.controller.js';
import { ServicesRepository } from './repositories/services.repository.js';
import { BookingService, BookingServiceSchema } from './schemas/service.schema.js';
import { ServicesService } from './services/services.service.js';
@Module({ imports: [MongooseModule.forFeature([{ name: BookingService.name, schema: BookingServiceSchema }]), SchedulingModule], controllers: [ServicesController], providers: [ServicesRepository, ServicesService], exports: [ServicesRepository] })
export class ServicesModule {}
