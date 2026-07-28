import { BullModule } from '@nestjs/bullmq';
import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CacheModule } from '../../cache/cache.module.js';
import { CrmModule } from '../crm/crm.module.js';
import { NodeHandlerRegistry } from './actions/node-handler.registry.js';
import { WorkflowController } from './controllers/workflow.controller.js';
import { WorkflowProcessor } from './jobs/workflow.processor.js';
import { WorkflowSchedulerProcessor } from './jobs/workflow-scheduler.processor.js';
import { WorkflowRepository } from './repositories/workflow.repository.js';
import { WorkflowDeduplicationKey, WorkflowDeduplicationKeySchema, WorkflowDefinition, WorkflowDefinitionSchema, WorkflowRun, WorkflowRunSchema, WorkflowStepRun, WorkflowStepRunSchema, WorkflowVersion, WorkflowVersionSchema, WorkflowWaitState, WorkflowWaitStateSchema } from './schemas/workflow.schemas.js';
import { WorkflowGraphValidator } from './services/workflow-graph-validator.service.js';
import { WORKFLOW_SCHEDULER_QUEUE, WorkflowSchedulerService } from './services/workflow-scheduler.service.js';
import { WORKFLOW_QUEUE, WorkflowService } from './services/workflow.service.js';
@Module({imports:[CacheModule,CrmModule,BullModule.registerQueue({name:WORKFLOW_QUEUE},{name:WORKFLOW_SCHEDULER_QUEUE}),MongooseModule.forFeature([{name:WorkflowDefinition.name,schema:WorkflowDefinitionSchema},{name:WorkflowVersion.name,schema:WorkflowVersionSchema},{name:WorkflowRun.name,schema:WorkflowRunSchema},{name:WorkflowStepRun.name,schema:WorkflowStepRunSchema},{name:WorkflowWaitState.name,schema:WorkflowWaitStateSchema},{name:WorkflowDeduplicationKey.name,schema:WorkflowDeduplicationKeySchema}])],controllers:[WorkflowController],providers:[WorkflowRepository,WorkflowGraphValidator,NodeHandlerRegistry,WorkflowService,WorkflowSchedulerService,WorkflowProcessor,WorkflowSchedulerProcessor],exports:[WorkflowService]})
export class WorkflowsModule {}
