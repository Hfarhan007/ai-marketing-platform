import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MongooseModule } from '@nestjs/mongoose';
import { ConsentModule } from '../consent/consent.module.js';
import { AiModule } from '../ai/ai.module.js';
import { AiMemoryRecord, AiMemoryRecordSchema } from './ai-memory.schema.js';
import { AiMemoryService } from './ai-memory.service.js';
import { AiMemoryRepository } from './repositories/ai-memory.repository.js';
import { Agent, AgentApproval, AgentApprovalSchema, AgentEvaluation, AgentEvaluationSchema, AgentMemoryRecord, AgentMemoryRecordSchema, AgentMessage, AgentMessageSchema, AgentModelCall, AgentModelCallSchema, AgentOrchestrationRun, AgentOrchestrationRunSchema, AgentRun, AgentRunArtifact, AgentRunArtifactSchema, AgentRunSchema, AgentRunStep, AgentRunStepSchema, AgentSchema, AgentUsage, AgentUsageSchema, AgentVersion, AgentVersionSchema, ToolExecution, ToolExecutionSchema } from './schemas/agent.schemas.js';
import { AgentRunsRepository } from './repositories/agent-runs.repository.js';
import { AgentMemoryRepository } from './repositories/agent-memory.repository.js';
import { AgentMemoryPolicyService } from './agent-memory-policy.service.js';
import { AgentMemoryService } from './agent-memory.service.js';
import { AgentExecutionPolicy } from './policies/agent-execution.policy.js';
import { AgentToolRegistry } from './tools/agent-tool.registry.js';
import { AgentToolExecutor } from './tools/agent-tool-executor.service.js';
import { StarterToolProvider } from './tools/starter-tool.provider.js';
import { StarterToolRegistrar } from './tools/starter-tool.registrar.js';
import { AgentRunnerService } from './agent-runner.service.js';
import { AGENT_RUNTIME_EVENTS, AGENT_RUNTIME_STORE, AgentRuntimeService } from './runtime/agent-runtime.service.js';
import { MongooseRuntimeStore } from './repositories/mongoose-runtime.store.js';
import { AgentRuntimeEventsService } from './runtime/agent-runtime-events.service.js';
import { AGENT_RUN_QUEUE, AgentRunQueueService, AgentRunWorker } from './runtime/agent-runtime.queue.js';
import { AgentRuntimeRecordsService } from './repositories/agent-runtime-records.service.js';
import { MemoryExtractionPolicy } from './memory/memory-extraction.policy.js';
import { MultiAgentOrchestratorService } from './orchestration/multi-agent-orchestrator.service.js';
import { DefaultOrchestrationPolicy, DenySubAgentExecution } from './orchestration/orchestration.policy.js';
import { ORCHESTRATION_AUDIT, ORCHESTRATION_POLICY, SUB_AGENT_EXECUTION } from './orchestration/orchestration.types.js';
import { OrchestrationAuditRepository } from './repositories/orchestration-audit.repository.js';

@Module({
  imports: [
    ConsentModule,
    AiModule,
    BullModule.registerQueue({ name: AGENT_RUN_QUEUE }),
    MongooseModule.forFeature([
      { name: AiMemoryRecord.name, schema: AiMemoryRecordSchema },
      { name: Agent.name, schema: AgentSchema },
      { name: AgentVersion.name, schema: AgentVersionSchema },
      { name: AgentRun.name, schema: AgentRunSchema },
      { name: AgentRunStep.name, schema: AgentRunStepSchema },
      { name: AgentModelCall.name, schema: AgentModelCallSchema },
      { name: AgentApproval.name, schema: AgentApprovalSchema },
      { name: AgentRunArtifact.name, schema: AgentRunArtifactSchema },
      { name: AgentOrchestrationRun.name, schema: AgentOrchestrationRunSchema },
      { name: AgentMessage.name, schema: AgentMessageSchema },
      { name: AgentMemoryRecord.name, schema: AgentMemoryRecordSchema },
      { name: ToolExecution.name, schema: ToolExecutionSchema },
      { name: AgentUsage.name, schema: AgentUsageSchema },
      { name: AgentEvaluation.name, schema: AgentEvaluationSchema },
    ]),
  ],
  providers: [AiMemoryRepository, AiMemoryService, MemoryExtractionPolicy, AgentRunsRepository, AgentMemoryRepository, AgentMemoryPolicyService, AgentMemoryService, AgentExecutionPolicy, AgentToolRegistry, AgentToolExecutor, StarterToolProvider, StarterToolRegistrar, AgentRunnerService, MongooseRuntimeStore, AgentRuntimeEventsService, AgentRuntimeRecordsService, OrchestrationAuditRepository, DefaultOrchestrationPolicy, DenySubAgentExecution, { provide: ORCHESTRATION_POLICY, useExisting: DefaultOrchestrationPolicy }, { provide: SUB_AGENT_EXECUTION, useExisting: DenySubAgentExecution }, { provide: ORCHESTRATION_AUDIT, useExisting: OrchestrationAuditRepository }, MultiAgentOrchestratorService, { provide: AGENT_RUNTIME_STORE, useExisting: MongooseRuntimeStore }, { provide: AGENT_RUNTIME_EVENTS, useExisting: AgentRuntimeEventsService }, AgentRuntimeService, AgentRunQueueService, AgentRunWorker],
  exports: [AiMemoryService, AgentMemoryService, AgentToolExecutor, AgentRunnerService, MultiAgentOrchestratorService, AgentRuntimeService, AgentRunQueueService, AgentRuntimeEventsService, AgentRuntimeRecordsService],
})
export class AgentsModule {}
