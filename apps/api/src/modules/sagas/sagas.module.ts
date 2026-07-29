import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { EventsModule } from '../../events/events.module.js';
import { SagaController } from './controllers/saga.controller.js';
import { SagaMonitorProcessor, SagaProcessor, StuckSagaDetector } from './jobs/saga.processor.js';
import { SagaRepository } from './repositories/saga.repository.js';
import { Saga, SagaAlert, SagaAlertSchema, SagaSchema } from './schemas/saga.schema.js';
import { SAGA_MONITOR_QUEUE, SAGA_QUEUE, SagaService } from './saga.service.js';
import { SagaStepExecutor } from './saga-step-executor.service.js';

@Module({
  imports: [
    EventsModule,
    BullModule.registerQueue({ name: SAGA_QUEUE }, { name: SAGA_MONITOR_QUEUE }),
    MongooseModule.forFeature([
      { name: Saga.name, schema: SagaSchema },
      { name: SagaAlert.name, schema: SagaAlertSchema },
    ]),
  ],
  controllers: [SagaController],
  providers: [
    SagaRepository,
    SagaStepExecutor,
    SagaService,
    SagaProcessor,
    StuckSagaDetector,
    SagaMonitorProcessor,
  ],
  exports: [SagaService],
})
export class SagasModule {}
