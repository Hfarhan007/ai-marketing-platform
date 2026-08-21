import { Module, OnModuleInit } from '@nestjs/common';
import { BullModule } from '@nestjs/bullmq';
import { MongooseModule } from '@nestjs/mongoose';
import { CacheModule } from '../../cache/cache.module.js';
import { AiGatewayService } from './ai-gateway.service.js';
import { OpenAiProvider } from './providers/openai.provider.js';
import { GeminiProvider } from './providers/gemini.provider.js';
import { GroqProvider } from './providers/groq.provider.js';
import { OpenRouterProvider } from './providers/openrouter.provider.js';
import { OllamaProvider } from './providers/ollama.provider.js';
import { MockAiProvider } from './providers/mock.provider.js';
import { ConfigService } from '@nestjs/config';
import { CapabilityRegistry } from './routing/capability-registry.js';
import { ModelRouterService } from './routing/model-router.service.js';
import { FallbackPolicyService } from './routing/fallback-policy.service.js';
import { TokenCounterService } from './usage/token-counter.service.js';
import { CostCalculatorService } from './usage/cost-calculator.service.js';
import { AiUsageRepository } from './usage/ai-usage.repository.js';
import { PromptTemplate, PromptTemplateSchema } from './prompts/prompt-template.schema.js';
import { PromptVersion, PromptVersionSchema } from './prompts/prompt-version.schema.js';
import { PromptRegistryService } from './prompts/prompt-registry.service.js';
import { PromptRepository } from './prompts/repositories/prompt.repository.js';
import { AiStreamingService } from './streaming/ai-streaming.service.js';
import { AiCacheService } from './cache/ai-cache.service.js';
import { ModerationService } from './safety/moderation.service.js';
import { PiiRedactionService } from './safety/pii-redaction.service.js';
import { PromptInjectionDetector } from './safety/prompt-injection-detector.js';
import { AiEvaluationRun, AiEvaluationRunSchema, AiExecutionTrace, AiExecutionTraceSchema, AiFeedback, AiFeedbackEvaluationCase, AiFeedbackEvaluationCaseSchema, AiFeedbackRegressionAlert, AiFeedbackRegressionAlertSchema, AiFeedbackSchema, AiGoldenCase, AiGoldenCaseSchema, AiIncident, AiIncidentSchema, AiSafetyIntervention, AiSafetyInterventionSchema, AiSafetyPolicy, AiSafetyPolicySchema } from './schemas/ai-governance.schemas.js';
import { AiGovernanceRepository } from './repositories/ai-governance.repository.js';
import { AiSafetyService } from './safety/ai-safety.service.js';
import { AiObservabilityService } from './observability/ai-observability.service.js';
import { AiFeedbackService } from './feedback/ai-feedback.service.js';
import { AiEvaluationService } from './evaluations/ai-evaluation.service.js';
import { AiAdminReportService } from './observability/ai-admin-report.service.js';
import { AiGovernanceController } from './controllers/ai-governance.controller.js';
import { AiControlPlaneService } from './control-plane/ai-control-plane.service.js';
import { AI_TOOL_EXECUTION_PORT, DenyByDefaultAiToolExecutor } from './control-plane/ai-tool-execution.port.js';
import { WorkspaceAiPolicyResolver } from './control-plane/workspace-ai-policy-resolver.service.js';
import { AI_EXECUTION_QUEUE, AiAsyncExecutionService, AiExecutionProcessor } from './control-plane/ai-async-execution.service.js';
import { ProviderHealthService } from './routing/provider-health.service.js';
import { PromptApprovalAudit, PromptApprovalAuditSchema, PromptAssignment, PromptAssignmentSchema } from './prompts/prompt-lifecycle.schemas.js';
import { PromptLifecycleService } from './prompts/prompt-lifecycle.service.js';
import { ResponseControlsService } from './control-plane/response-controls.service.js';
import { AiReliabilityService } from './reliability/ai-reliability.service.js';
import { AiReliabilityMetricsService } from './reliability/ai-reliability-metrics.service.js';
@Module({
  imports: [
    CacheModule,
    BullModule.registerQueue({ name: AI_EXECUTION_QUEUE }),
    MongooseModule.forFeature([
      { name: PromptTemplate.name, schema: PromptTemplateSchema },
      { name: PromptVersion.name, schema: PromptVersionSchema },
      { name: PromptAssignment.name, schema: PromptAssignmentSchema },
      { name: PromptApprovalAudit.name, schema: PromptApprovalAuditSchema },
      { name: AiSafetyPolicy.name, schema: AiSafetyPolicySchema },
      { name: AiExecutionTrace.name, schema: AiExecutionTraceSchema },
      { name: AiFeedback.name, schema: AiFeedbackSchema },
      { name: AiFeedbackEvaluationCase.name, schema: AiFeedbackEvaluationCaseSchema },
      { name: AiFeedbackRegressionAlert.name, schema: AiFeedbackRegressionAlertSchema },
      { name: AiSafetyIntervention.name, schema: AiSafetyInterventionSchema },
      { name: AiIncident.name, schema: AiIncidentSchema },
      { name: AiGoldenCase.name, schema: AiGoldenCaseSchema },
      { name: AiEvaluationRun.name, schema: AiEvaluationRunSchema },
    ]),
  ],
  controllers: [AiGovernanceController],
  providers: [
    AiGatewayService,
    OpenAiProvider,
    GeminiProvider,
    GroqProvider,
    OpenRouterProvider,
    OllamaProvider,
    CapabilityRegistry,
    ModelRouterService,
    FallbackPolicyService,
    TokenCounterService,
    CostCalculatorService,
    AiUsageRepository,
    PromptRegistryService,
    PromptRepository,
    AiStreamingService,
    AiCacheService,
    ModerationService,
    PiiRedactionService,
    PromptInjectionDetector,
    AiGovernanceRepository,
    AiSafetyService,
    AiObservabilityService,
    AiFeedbackService,
    AiEvaluationService,
    AiAdminReportService,
    AiControlPlaneService,
    WorkspaceAiPolicyResolver,
    { provide: AI_TOOL_EXECUTION_PORT, useClass: DenyByDefaultAiToolExecutor },
    AiAsyncExecutionService,
    AiExecutionProcessor,
    ProviderHealthService,
    PromptLifecycleService,
    ResponseControlsService,
    AiReliabilityService,
    AiReliabilityMetricsService,
  ],
  exports: [AiGatewayService, AiControlPlaneService, AiAsyncExecutionService, AiStreamingService, PromptRegistryService, PromptLifecycleService, PromptInjectionDetector, PiiRedactionService, AiSafetyService, AiFeedbackService, AiEvaluationService, AiObservabilityService, AiAdminReportService, AiReliabilityService, AiReliabilityMetricsService],
})
export class AiModule implements OnModuleInit {
  constructor(
    private readonly gateway: AiGatewayService,
    openai: OpenAiProvider,
    gemini: GeminiProvider,
    groq: GroqProvider,
    openrouter: OpenRouterProvider,
    ollama: OllamaProvider,
    config: ConfigService,
  ) {
    for (const provider of [openai, gemini, groq, openrouter, ollama]) gateway.register(provider);
    if (config.get<boolean>('ai.developmentMockFallback'))
      gateway.register(new MockAiProvider(JSON.stringify({ score: 0, qualification: 'unqualified', intent: 'unknown', summary: 'Development fallback: provider unavailable.', recommendedAction: 'Review manually', suggestedReply: 'Thanks for reaching out. A teammate will follow up shortly.', confidence: 0 })));
  }
  onModuleInit() {}
}
