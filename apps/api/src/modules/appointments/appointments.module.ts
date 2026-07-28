import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { SchedulingModule } from '../scheduling/scheduling.module.js';
import { AvailabilityModule } from '../availability/availability.module.js';
import { ServicesModule } from '../services/services.module.js';
import { AppointmentsController } from './controllers/appointments.controller.js';
import { AppointmentsRepository } from './repositories/appointments.repository.js';
import { Appointment, AppointmentSchema } from './schemas/appointment.schema.js';
import { AppointmentsService } from './services/appointments.service.js';
@Module({ imports: [MongooseModule.forFeature([{ name: Appointment.name, schema: AppointmentSchema }]), SchedulingModule, AvailabilityModule, ServicesModule], controllers: [AppointmentsController], providers: [AppointmentsRepository, AppointmentsService], exports: [AppointmentsRepository, AppointmentsService] })
export class AppointmentsModule {}
