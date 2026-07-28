import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SchedulingModule } from '../scheduling/scheduling.module.js';
import { BookingLinksController } from './controllers/booking-links.controller.js';
import { BookingLinksRepository } from './repositories/booking-links.repository.js';
import { BookingLink, BookingLinkSchema } from './schemas/booking-link.schema.js';
import { BookingLinksService } from './services/booking-links.service.js';
@Module({ imports: [MongooseModule.forFeature([{ name: BookingLink.name, schema: BookingLinkSchema }]), SchedulingModule], controllers: [BookingLinksController], providers: [BookingLinksRepository, BookingLinksService] })
export class BookingLinksModule {}
