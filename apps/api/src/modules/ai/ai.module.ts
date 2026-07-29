import { Module, OnModuleInit } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { CacheModule } from '../../cache/cache.module.js';
import { AiGatewayService } from './ai-gateway.service.js';
import { OpenAiProvider } from './providers/openai.provider.js';
import { GeminiProvider } from './providers/gemini.provider.js';
import { GroqProvider } from './providers/groq.provider.js';
import { OpenRouterProvider } from './providers/openrouter.provider.js';
import { OllamaProvider } from './providers/ollama.provider.js';
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
import { AiEvaluationRun, AiEvaluationRunSchema, AiExecutionTrace, AiExecutionTraceSchema, AiFeedback, AiFeedbackSchema, AiGoldenCase, AiGoldenCaseSchema, AiIncident, AiIncidentSchema, AiSafetyIntervention, AiSafetyInterventionSchema, AiSafetyPolicy, AiSafetyPolicySchema } from './schemas/ai-governance.schemas.js';
import { AiGovernanceRepository } from './repositories/ai-governance.repository.js';
import { AiSafetyService } from './safety/ai-safety.service.js';
import { AiObservabilityService } from './observability/ai-observability.service.js';
import { AiFeedbackService } from './feedback/ai-feedback.service.js';
import { AiEvaluationService } from './evaluations/ai-evaluation.service.js';
import { AiAdminReportService } from './observability/ai-admin-report.service.js';
import { AiGovernanceController } from './controllers/ai-governance.controller.js';
@Module({
  imports: [
    CacheModule,
    MongooseModule.forFeature([
      { name: PromptTemplate.name, schema: PromptTemplateSchema },
      { name: PromptVersion.name, schema: PromptVersionSchema },
      { name: AiSafetyPolicy.name, schema: AiSafetyPolicySchema },
      { name: AiExecutionTrace.name, schema: AiExecutionTraceSchema },
      { name: AiFeedback.name, schema: AiFeedbackSchema },
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
  ],
  exports: [AiGatewayService, AiStreamingService, PromptRegistryService, PromptInjectionDetector, AiSafetyService, AiFeedbackService, AiEvaluationService, AiObservabilityService, AiAdminReportService],
})
export class AiModule implements OnModuleInit {
  constructor(
    private readonly gateway: AiGatewayService,
    openai: OpenAiProvider,
    gemini: GeminiProvider,
    groq: GroqProvider,
    openrouter: OpenRouterProvider,
    ollama: OllamaProvider,
  ) {
    for (const provider of [openai, gemini, groq, openrouter, ollama]) gateway.register(provider);
  }
  onModuleInit() {}
}
