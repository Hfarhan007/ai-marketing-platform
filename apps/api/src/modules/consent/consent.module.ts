import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ConsentEvaluationService } from './consent-evaluation.service.js';
import { ConsentRepository } from './repositories/consent.repository.js';
import { ConsentService } from './consent.service.js';
import {
  ConsentAuditEvent,
  ConsentAuditEventSchema,
  ConsentLegalBasis,
  ConsentLegalBasisSchema,
  ConsentPolicy,
  ConsentPolicySchema,
  ConsentPolicyVersion,
  ConsentPolicyVersionSchema,
  ConsentPurposeDefinition,
  ConsentPurposeDefinitionSchema,
  ConsentReceipt,
  ConsentReceiptSchema,
  ConsentSourceEvidence,
  ConsentSourceEvidenceSchema,
  ConsentWithdrawal,
  ConsentWithdrawalSchema,
} from './schemas/consent.schemas.js';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: ConsentPurposeDefinition.name, schema: ConsentPurposeDefinitionSchema },
      { name: ConsentPolicy.name, schema: ConsentPolicySchema },
      { name: ConsentPolicyVersion.name, schema: ConsentPolicyVersionSchema },
      { name: ConsentLegalBasis.name, schema: ConsentLegalBasisSchema },
      { name: ConsentSourceEvidence.name, schema: ConsentSourceEvidenceSchema },
      { name: ConsentReceipt.name, schema: ConsentReceiptSchema },
      { name: ConsentWithdrawal.name, schema: ConsentWithdrawalSchema },
      { name: ConsentAuditEvent.name, schema: ConsentAuditEventSchema },
    ]),
  ],
  providers: [ConsentRepository, ConsentEvaluationService, ConsentService],
  exports: [ConsentEvaluationService, ConsentService],
})
export class ConsentModule {}
