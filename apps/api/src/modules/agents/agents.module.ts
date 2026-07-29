import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConsentModule } from '../consent/consent.module.js';
import { AiModule } from '../ai/ai.module.js';
import { AiMemoryRecord, AiMemoryRecordSchema } from './ai-memory.schema.js';
import { AiMemoryService } from './ai-memory.service.js';
import { AiMemoryRepository } from './repositories/ai-memory.repository.js';
import { Agent, AgentEvaluation, AgentEvaluationSchema, AgentMemoryRecord, AgentMemoryRecordSchema, AgentMessage, AgentMessageSchema, AgentRun, AgentRunSchema, AgentSchema, AgentUsage, AgentUsageSchema, AgentVersion, AgentVersionSchema, ToolExecution, ToolExecutionSchema } from './schemas/agent.schemas.js';
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

@Module({
  imports: [
    ConsentModule,
    AiModule,
    MongooseModule.forFeature([
      { name: AiMemoryRecord.name, schema: AiMemoryRecordSchema },
      { name: Agent.name, schema: AgentSchema },
      { name: AgentVersion.name, schema: AgentVersionSchema },
      { name: AgentRun.name, schema: AgentRunSchema },
      { name: AgentMessage.name, schema: AgentMessageSchema },
      { name: AgentMemoryRecord.name, schema: AgentMemoryRecordSchema },
      { name: ToolExecution.name, schema: ToolExecutionSchema },
      { name: AgentUsage.name, schema: AgentUsageSchema },
      { name: AgentEvaluation.name, schema: AgentEvaluationSchema },
    ]),
  ],
  providers: [AiMemoryRepository, AiMemoryService, AgentRunsRepository, AgentMemoryRepository, AgentMemoryPolicyService, AgentMemoryService, AgentExecutionPolicy, AgentToolRegistry, AgentToolExecutor, StarterToolProvider, StarterToolRegistrar, AgentRunnerService],
  exports: [AiMemoryService, AgentMemoryService, AgentToolExecutor, AgentRunnerService],
})
export class AgentsModule {}
