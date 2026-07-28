import { Module } from '@nestjs/common';
import { AppointmentsModule } from '../appointments/appointments.module.js';
import { CalendarController } from './controllers/calendar.controller.js';
import { CalendarService } from './services/calendar.service.js';
@Module({ imports: [AppointmentsModule], controllers: [CalendarController], providers: [CalendarService] })
export class CalendarModule {}
